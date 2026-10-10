'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Eye,
  EyeOff,
  Link2,
  Mail,
  Radio,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';
import { Avatar, Segmented, cn, timeAgo, useCountUp } from '@/components/AdminUI';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */
// Status colors are always paired with an icon + label, never color alone.
const VERDICTS = [
  { key: 'safe', label: 'Safe', color: '#0ca30c', Icon: ShieldCheck },
  { key: 'suspicious', label: 'Suspicious', color: '#fab219', Icon: ShieldAlert },
  { key: 'phishing', label: 'Phishing', color: '#d03b3b', Icon: ShieldX },
];
const SCAN_TYPES = [
  { key: 'url_scans', label: 'URL scans', color: '#3987e5', Icon: Link2 },
  { key: 'email_scans', label: 'Email scans', color: '#d95926', Icon: Mail },
];

// Tune these bands to whatever "normal" looks like on your platform.
const THREAT_LEVELS = [
  { max: 10, label: 'Low', color: '#0ca30c', Icon: ShieldCheck },
  { max: 25, label: 'Elevated', color: '#fab219', Icon: ShieldAlert },
  { max: Infinity, label: 'High', color: '#d03b3b', Icon: ShieldX },
];

const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
];
const VIEW_OPTIONS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

const SURFACE = '#0f172a'; // slate-900: the gap between stacked bar segments
const LIVE_INTERVAL_MS = 30000;
const LOADING_DELAY_MS = 250;

const CSS = `
@keyframes anRise {
  from { opacity: 0; transform: translateY(14px) }
  to { opacity: 1; transform: none }
}
@keyframes anFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes anDraw { to { stroke-dashoffset: 0 } }
@keyframes anShimmer {
  from { background-position: 200% 0 }
  to { background-position: -200% 0 }
}
.an-rise { animation: anRise .55s cubic-bezier(.22,1,.36,1) backwards }
.an-fade { animation: anFade .9s ease-out .3s backwards }
.an-draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: anDraw 1.1s cubic-bezier(.22,1,.36,1) .15s forwards;
}
.an-shimmer {
  background: linear-gradient(90deg,
    rgba(30,41,59,.45) 25%, rgba(51,65,85,.55) 50%, rgba(30,41,59,.45) 75%);
  background-size: 200% 100%;
  animation: anShimmer 1.5s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .an-rise, .an-fade, .an-shimmer { animation: none !important }
  .an-draw { animation: none !important; stroke-dashoffset: 0 }
}
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const delay = (index, step = 70) => ({ animationDelay: `${index * step}ms` });

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const fmtClock = (date) =>
  date
    ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

const sum = (values) => values.reduce((total, value) => total + value, 0);

// Makes links/addresses safe to read: http -> hxxp, . -> [.], @ -> [@]
const defang = (text) =>
  String(text ?? '')
    .replace(/http/gi, 'hxxp')
    .replace(/\./g, '[.]')
    .replace(/@/g, '[@]');

function describeTarget(content) {
  if (typeof content === 'string' && content.startsWith('[EMAIL]')) {
    const [primary, secondary] = content
      .replace('[EMAIL]', '')
      .trim()
      .split('|');
    return {
      primary: primary?.trim() || 'Email analysis',
      secondary: secondary?.trim() || '',
    };
  }
  return { primary: content || 'Unknown target', secondary: '' };
}

function sparkPaths(values, width, height, pad = 3) {
  if (!values.length) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => [
    pad + index * step,
    height - pad - ((value - min) / range) * (height - pad * 2),
  ]);

  let line = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const cx = (px + x) / 2;
    line += ` C${cx},${py} ${cx},${y} ${x},${y}`;
  }

  const last = points[points.length - 1];
  const area = `${line} L${last[0]},${height} L${points[0][0]},${height} Z`;

  return { line, area };
}

/* ------------------------------------------------------------------ */
/* Small visuals                                                       */
/* ------------------------------------------------------------------ */
function Sparkline({ values, color, id }) {
  const paths = sparkPaths(values, 160, 40);
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 160 40"
      preserveAspectRatio="none"
      className="mt-3 h-10 w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#spark-${id})`} className="an-fade" />
      <path
        d={paths.line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength="1"
        className="an-draw"
      />
    </svg>
  );
}

function ThreatGauge({ rate }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const level =
    THREAT_LEVELS.find((item) => rate < item.max) ||
    THREAT_LEVELS[THREAT_LEVELS.length - 1];
  const percent = Math.min(100, Math.max(0, Number(rate) || 0));
  const arc = 'M10 60 A50 50 0 0 1 110 60';

  return (
    <svg
      viewBox="0 0 120 68"
      className="h-14 w-24 flex-shrink-0"
      role="img"
      aria-label={`Threat rate ${percent}% (${level.label})`}
    >
      <path
        d={arc}
        fill="none"
        stroke="#1e293b"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {percent > 0 && (
        <path
          d={arc}
          fill="none"
          stroke={level.color}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${ready ? percent : 0} 100`}
          style={{
            transition:
              'stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1), stroke .3s',
          }}
        />
      )}
    </svg>
  );
}

function KpiTile({
  label,
  value,
  decimals = 0,
  suffix = '',
  sub,
  Icon,
  accent,
  spark,
  aside,
  index = 0,
}) {
  const animated = useCountUp(value);

  return (
    <div
      className="an-rise group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700"
      style={delay(index)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: accent }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </div>

      <div className="relative mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold tabular-nums text-white">
          {animated.toLocaleString('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })}
          {suffix}
        </p>
        {aside}
      </div>

      {sub && <div className="relative mt-1 text-xs text-slate-400">{sub}</div>}

      {spark && (
        <div className="relative">
          <Sparkline values={spark.values} color={accent} id={spark.id} />
        </div>
      )}
    </div>
  );
}

function Donut({ title, subtitle, items, values, centerLabel, index = 0 }) {
  const total = sum(items.map((item) => values[item.key] || 0));
  const animatedTotal = useCountUp(total);
  const [hover, setHover] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const visibleCount = items.filter((item) => values[item.key]).length;
  const gap = visibleCount > 1 ? 1.2 : 0;
  let offset = 0;

  return (
    <section
      className="an-rise rounded-xl border border-slate-800 bg-slate-900/50 p-5"
      style={delay(index)}
    >
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-40 w-40 flex-shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="h-full w-full -rotate-90"
            role="img"
            aria-label={title}
          >
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke="#1e293b"
              strokeWidth="16"
            />
            {total > 0 &&
              items.map((item) => {
                const count = values[item.key] || 0;
                if (!count) return null;

                const length = (count / total) * 100;
                const segment = Math.max(length - gap, 0.5);
                const segmentOffset = offset;
                offset += length;

                return (
                  <circle
                    key={item.key}
                    cx="80"
                    cy="80"
                    r="62"
                    fill="none"
                    stroke={item.color}
                    strokeWidth={hover === item.key ? 20 : 16}
                    pathLength="100"
                    strokeDasharray={`${ready ? segment : 0} 100`}
                    strokeDashoffset={-segmentOffset}
                    style={{
                      transition:
                        'stroke-dasharray 1.1s cubic-bezier(.22,1,.36,1), stroke-width .2s, opacity .2s',
                      opacity: hover && hover !== item.key ? 0.35 : 1,
                    }}
                    onMouseEnter={() => setHover(item.key)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-extrabold tabular-nums text-white">
              {hover
                ? (values[hover] || 0).toLocaleString('en-IN')
                : Math.round(animatedTotal).toLocaleString('en-IN')}
            </span>
            <span className="mt-0.5 text-[11px] text-slate-400">
              {hover
                ? items.find((item) => item.key === hover)?.label
                : centerLabel}
            </span>
          </div>
        </div>

        <ul className="w-full flex-1 space-y-2 text-sm">
          {items.map(({ key, label, color, Icon }) => {
            const count = values[key] || 0;
            const percent = total ? Math.round((count * 100) / total) : 0;

            return (
              <li
                key={key}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors',
                  hover === key ? 'bg-slate-800/70' : 'bg-transparent'
                )}
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <Icon
                    className="h-4 w-4"
                    style={{ color }}
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span className="tabular-nums text-white">
                  {count.toLocaleString('en-IN')}{' '}
                  <span className="text-slate-500">· {percent}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Insight({ Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-xs font-medium tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}

function DailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="mb-1 font-semibold text-white">{fmtDay(label)}</p>
      {[...VERDICTS].reverse().map(({ key, label: name, color }) => (
        <p
          key={key}
          className="flex items-center justify-between gap-6 text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ background: color }}
            />
            {name}
          </span>
          <span className="tabular-nums text-white">{row[key]}</span>
        </p>
      ))}
      <p className="mt-1 flex justify-between border-t border-slate-800 pt-1 text-slate-400">
        <span>Total</span>
        <span className="tabular-nums text-white">{row.total}</span>
      </p>
    </div>
  );
}

function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {items.map(({ key, label, color }) => (
        <li key={key} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: color }}
            aria-hidden="true"
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
          >
            <div className="an-shimmer h-3 w-24 rounded" />
            <div className="an-shimmer mt-4 h-8 w-20 rounded" />
            <div className="an-shimmer mt-3 h-3 w-28 rounded" />
            <div className="an-shimmer mt-4 h-10 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="an-shimmer h-4 w-32 rounded" />
        <div className="an-shimmer mt-4 h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function AdminAnalytics() {
  const [days, setDays] = useState(14);
  const [view, setView] = useState('chart');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [live, setLive] = useState(false);
  const [defanged, setDefanged] = useState(true);

  const requestRef = useRef(0);
  const fetchRef = useRef(null);

  const fetchStats = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestRef.current;
      if (!silent) setLoading(true);

      try {
        const res = await api.get(ENDPOINTS.ADMIN_STATS, { params: { days } });
        if (requestId !== requestRef.current) return;

        setStats(res.data);
        setError('');
        setUpdatedAt(new Date());
      } catch {
        if (requestId !== requestRef.current) return;
        setError('Could not load analytics.');
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [days]
  );

  fetchRef.current = fetchStats;

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Only show loading visuals if a request is actually slow
  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLoading(true), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Optional live mode: silent refresh while the tab is visible
  useEffect(() => {
    if (!live) return;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRef.current?.({ silent: true });
      }
    }, LIVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [live]);

  /* ------------------------- First-load states ----------------------- */
  if (!stats && error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 text-center">
        <ShieldX className="h-6 w-6 text-red-400" aria-hidden="true" />
        <p className="text-sm text-slate-300">{error}</p>
        <button
          type="button"
          onClick={() => fetchStats()}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <>
        <style>{CSS}</style>
        <AnalyticsSkeleton />
      </>
    );
  }

  /* ----------------------------- Derived ----------------------------- */
  const { totals, by_verdict, daily, top_users, recent_threats } = stats;
  const verdictMeta = Object.fromEntries(VERDICTS.map((v) => [v.key, v]));

  const totalSeries = daily.map((d) => d.total || 0);
  const threatSeries = daily.map(
    (d) => (d.suspicious || 0) + (d.phishing || 0)
  );
  const rangeTotal = sum(totalSeries);
  const rangeThreats = sum(threatSeries);
  const peakDay = daily.reduce(
    (best, day) => (!best || day.total > best.total ? day : best),
    null
  );
  const average = daily.length ? rangeTotal / daily.length : 0;
  const maxUserScans = Math.max(...top_users.map((u) => u.scans), 1);

  const threatRate = Number(totals.threat_rate) || 0;
  const level =
    THREAT_LEVELS.find((item) => threatRate < item.max) ||
    THREAT_LEVELS[THREAT_LEVELS.length - 1];

  const isRefreshing = showLoading;

  return (
    <div className="space-y-6">
      <style>{CSS}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Platform analytics
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {updatedAt ? `Updated ${fmtClock(updatedAt)}` : 'Loading...'}
            {error && (
              <span className="ml-2 text-amber-400">
                · refresh failed, showing last data
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLive((current) => !current)}
            aria-pressed={live}
            title="Refresh automatically every 30 seconds"
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200',
              live
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
            )}
          >
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  live ? 'bg-emerald-400' : 'bg-slate-600'
                )}
              />
            </span>
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            Live
          </button>

          <button
            type="button"
            onClick={() => fetchStats()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCw
              className={cn(
                'h-3.5 w-3.5',
                isRefreshing && 'animate-spin text-blue-400'
              )}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          index={0}
          label="Total Users"
          value={totals.users}
          sub={`${totals.admins} admin(s)`}
          Icon={Users}
          accent="#3987e5"
        />
        <KpiTile
          index={1}
          label="Total Scans"
          value={totals.scans}
          sub={`${totals.scans_today} today · last ${days}d trend`}
          Icon={Activity}
          accent="#8b5cf6"
          spark={{ values: totalSeries, id: 'scans' }}
        />
        <KpiTile
          index={2}
          label="Threats Detected"
          value={totals.threats}
          sub="phishing + suspicious"
          Icon={ShieldAlert}
          accent="#fab219"
          spark={{ values: threatSeries, id: 'threats' }}
        />
        <KpiTile
          index={3}
          label="Threat Rate"
          value={threatRate}
          decimals={1}
          suffix="%"
          Icon={ShieldX}
          accent={level.color}
          aside={<ThreatGauge rate={threatRate} />}
          sub={
            <span className="flex items-center gap-1.5">
              <level.Icon
                className="h-3.5 w-3.5"
                style={{ color: level.color }}
                aria-hidden="true"
              />
              <span className="font-medium text-slate-200">{level.label}</span>
              <span>· of all scans</span>
            </span>
          }
        />
      </div>

      {/* Daily trend */}
      <section
        className="an-rise rounded-xl border border-slate-800 bg-slate-900/50 p-5"
        style={delay(4)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Scans per day</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Every scan on the platform, split by verdict
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Segmented
              ariaLabel="Date range"
              options={RANGE_OPTIONS}
              value={days}
              onChange={setDays}
              className="w-40"
            />
            <Segmented
              ariaLabel="Chart or table"
              options={VIEW_OPTIONS}
              value={view}
              onChange={setView}
              className="w-36"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Insight
            Icon={TrendingUp}
            label="Peak day"
            value={
              peakDay && peakDay.total > 0
                ? `${fmtDay(peakDay.date)} · ${peakDay.total} scans`
                : 'No scans yet'
            }
          />
          <Insight
            Icon={Activity}
            label="Average per day"
            value={`${average.toLocaleString('en-IN', {
              maximumFractionDigits: 1,
            })} scans`}
          />
          <Insight
            Icon={ShieldAlert}
            label={`Threats in ${days}d`}
            value={`${rangeThreats} flagged`}
          />
        </div>

        <div className="mt-4">
          <Legend items={VERDICTS} />
        </div>

        <div
          className={cn(
            'transition-opacity duration-300',
            isRefreshing && 'opacity-50'
          )}
        >
          {view === 'table' ? (
            <div className="mt-4 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="py-2">Date</th>
                    {VERDICTS.map((v) => (
                      <th key={v.key} className="py-2 text-right">
                        {v.label}
                      </th>
                    ))}
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 tabular-nums">
                  {daily.map((d) => (
                    <tr key={d.date}>
                      <td className="py-1.5">{fmtDay(d.date)}</td>
                      {VERDICTS.map((v) => (
                        <td key={v.key} className="py-1.5 text-right">
                          {d[v.key]}
                        </td>
                      ))}
                      <td className="py-1.5 text-right text-white">
                        {d.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={daily}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<DailyTooltip />}
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  />
                  {VERDICTS.map((v, i) => (
                    <Bar
                      key={v.key}
                      dataKey={v.key}
                      name={v.label}
                      stackId="scans"
                      fill={v.color}
                      stroke={SURFACE}
                      strokeWidth={1}
                      radius={i === VERDICTS.length - 1 ? [4, 4, 0, 0] : 0}
                      maxBarSize={28}
                      animationDuration={700}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Breakdown donuts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Donut
          index={5}
          title="Verdict breakdown"
          subtitle="All time"
          items={VERDICTS}
          values={by_verdict}
          centerLabel="scans"
        />
        <Donut
          index={6}
          title="Scan type"
          subtitle="All time"
          items={SCAN_TYPES}
          values={totals}
          centerLabel="scans"
        />
      </div>

      {/* Top users + threat feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section
          className="an-rise rounded-xl border border-slate-800 bg-slate-900/50 p-5"
          style={delay(7)}
        >
          <h3 className="text-sm font-semibold text-white">Most active users</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Bar length shows share of the busiest user
          </p>

          {top_users.length === 0 ? (
            <p className="mt-6 text-xs text-slate-500">No scans yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {top_users.map((u, index) => (
                <li
                  key={u.id}
                  className="an-rise"
                  style={delay(index, 60)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 text-center text-[11px] font-semibold tabular-nums text-slate-600">
                      {index + 1}
                    </span>
                    <Avatar name={u.name} seed={u.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-medium text-white">
                          {u.name}
                        </p>
                        <p className="flex-shrink-0 text-xs tabular-nums text-white">
                          {u.scans}{' '}
                          <span className="text-slate-500">scans</span>
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <p className="truncate text-[11px] text-slate-500">
                          {u.email}
                        </p>
                        <p className="flex flex-shrink-0 items-center gap-1 text-[11px] tabular-nums text-slate-400">
                          <ShieldAlert
                            className="h-3 w-3 text-amber-400"
                            aria-hidden="true"
                          />
                          {u.threats} threats
                        </p>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-1000 ease-[cubic-bezier(.22,1,.36,1)]"
                          style={{
                            width: `${(u.scans / maxUserScans) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className="an-rise rounded-xl border border-slate-800 bg-slate-900/50 p-5"
          style={delay(8)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Latest threats detected
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {defanged
                  ? 'Links are defanged so they cannot be clicked by accident'
                  : 'Showing raw targets. Do not open them.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDefanged((current) => !current)}
              aria-pressed={defanged}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              {defanged ? (
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Defang {defanged ? 'on' : 'off'}
            </button>
          </div>

          {recent_threats.length === 0 ? (
            <p className="mt-6 text-xs text-slate-500">
              No threats detected yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {recent_threats.map((t, index) => {
                const v = verdictMeta[t.result] || verdictMeta.suspicious;
                const TypeIcon = t.type === 'email' ? Mail : Link2;
                const target = describeTarget(t.content);
                const primary = defanged ? defang(target.primary) : target.primary;
                const secondary = defanged
                  ? defang(target.secondary)
                  : target.secondary;

                return (
                  <li
                    key={t.id}
                    className="an-rise group relative flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 pl-4 transition-colors hover:border-slate-800 hover:bg-slate-900"
                    style={delay(index, 50)}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2.5 left-0 w-0.5 rounded-full"
                      style={{ background: v.color }}
                    />
                    <TypeIcon
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-mono text-xs text-white"
                        title={primary}
                      >
                        {primary}
                      </p>
                      {secondary && (
                        <p
                          className="truncate font-mono text-[11px] text-slate-400"
                          title={secondary}
                        >
                          {secondary}
                        </p>
                      )}
                      <p
                        className="mt-0.5 text-[11px] text-slate-500"
                        title={fmtTime(t.created_at)}
                      >
                        {t.user_email} · {timeAgo(t.created_at)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200">
                      <v.Icon
                        className="h-3.5 w-3.5"
                        style={{ color: v.color }}
                        aria-hidden="true"
                      />
                      {v.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}