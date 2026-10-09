'use client';

import { useEffect, useState } from 'react';
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
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Users,
  Link2,
  Mail,
  Loader2,
} from 'lucide-react';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';

// Status colors: always shown together with an icon + label, never color alone.
const VERDICTS = [
  { key: 'safe', label: 'Safe', color: '#0ca30c', Icon: ShieldCheck },
  { key: 'suspicious', label: 'Suspicious', color: '#fab219', Icon: ShieldAlert },
  { key: 'phishing', label: 'Phishing', color: '#d03b3b', Icon: ShieldX },
];
const SCAN_TYPES = [
  { key: 'url_scans', label: 'URL scans', color: '#3987e5', Icon: Link2 },
  { key: 'email_scans', label: 'Email scans', color: '#d95926', Icon: Mail },
];
const RANGES = [7, 14, 30];
const SURFACE = '#0f172a'; // slate-900, used for the 2px gap between stacked segments

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

function StatTile({ label, value, sub, Icon }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-slate-500" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {items.map(({ key, label, color }) => (
        <li key={key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

function DailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">{fmtDay(label)}</p>
      {[...VERDICTS].reverse().map(({ key, label: name, color }) => (
        <p key={key} className="flex items-center justify-between gap-6 text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
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

// One horizontal bar split into parts, with a labelled list underneath.
function PartToWhole({ title, items, values }) {
  const total = items.reduce((sum, i) => sum + (values[i.key] || 0), 0);
  const [hover, setHover] = useState(null);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={title}>
        {total === 0 ? (
          <div className="h-full w-full bg-slate-800" />
        ) : (
          items.map((i) =>
            values[i.key] ? (
              <div
                key={i.key}
                className="h-full transition-opacity"
                style={{
                  width: `${(values[i.key] / total) * 100}%`,
                  background: i.color,
                  opacity: hover && hover !== i.key ? 0.35 : 1,
                }}
                onMouseEnter={() => setHover(i.key)}
                onMouseLeave={() => setHover(null)}
                title={`${i.label}: ${values[i.key]}`}
              />
            ) : null
          )
        )}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map(({ key, label, color, Icon }) => {
          const n = values[key] || 0;
          const pct = total ? Math.round((n * 100) / total) : 0;
          return (
            <li
              key={key}
              className="flex items-center justify-between"
              onMouseEnter={() => setHover(key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="flex items-center gap-2 text-slate-300">
                <Icon className="h-4 w-4" style={{ color }} aria-hidden />
                {label}
              </span>
              <span className="tabular-nums text-white">
                {n} <span className="text-slate-500">· {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(ENDPOINTS.ADMIN_STATS, { params: { days } })
      .then((res) => {
        if (!cancelled) {
          setStats(res.data);
          setError('');
        }
      })
      .catch(() => !cancelled && setError('Could not load analytics.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!stats) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-400">
        {error || (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics...
          </span>
        )}
      </div>
    );
  }

  const { totals, by_verdict, daily, top_users, recent_threats } = stats;
  const verdictMeta = Object.fromEntries(VERDICTS.map((v) => [v.key, v]));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Users" value={totals.users} sub={`${totals.admins} admin(s)`} Icon={Users} />
        <StatTile label="Total Scans" value={totals.scans} sub={`${totals.scans_today} today`} Icon={Activity} />
        <StatTile
          label="Threats Detected"
          value={totals.threats}
          sub="phishing + suspicious"
          Icon={ShieldAlert}
        />
        <StatTile label="Threat Rate" value={`${totals.threat_rate}%`} sub="of all scans" Icon={ShieldX} />
      </div>

      {/* Daily trend */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Scans per day</h3>
            <p className="mt-0.5 text-xs text-slate-400">Every scan on the platform, split by verdict</p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
            <div className="flex rounded-md border border-slate-800 p-0.5 text-xs">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDays(r)}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    days === r ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}d
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTable((s) => !s)}
              className="rounded-md border border-slate-800 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
            >
              {showTable ? 'Chart' : 'Table'}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <Legend items={VERDICTS} />
        </div>

        {showTable ? (
          <div className="mt-4 max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-900 text-slate-400">
                <tr>
                  <th className="py-2">Date</th>
                  {VERDICTS.map((v) => (
                    <th key={v.key} className="py-2 text-right">{v.label}</th>
                  ))}
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 tabular-nums">
                {daily.map((d) => (
                  <tr key={d.date}>
                    <td className="py-1.5">{fmtDay(d.date)}</td>
                    {VERDICTS.map((v) => (
                      <td key={v.key} className="py-1.5 text-right">{d[v.key]}</td>
                    ))}
                    <td className="py-1.5 text-right text-white">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="25%">
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
                <Tooltip content={<DailyTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
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
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Breakdown bars */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PartToWhole title="Verdict breakdown (all time)" items={VERDICTS} values={by_verdict} />
        <PartToWhole title="Scan type (all time)" items={SCAN_TYPES} values={totals} />
      </div>

      {/* Top users + recent threats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white">Most active users</h3>
          {top_users.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No scans yet.</p>
          ) : (
            <table className="mt-3 w-full text-left text-xs text-slate-300">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-2">User</th>
                  <th className="py-2 text-right">Scans</th>
                  <th className="py-2 text-right">Threats found</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {top_users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums text-white">{u.scans}</td>
                    <td className="py-2 text-right tabular-nums">{u.threats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-sm font-semibold text-white">Latest threats detected</h3>
          {recent_threats.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No threats detected yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800/60">
              {recent_threats.map((t) => {
                const v = verdictMeta[t.result] || verdictMeta.suspicious;
                const TypeIcon = t.type === 'email' ? Mail : Link2;
                return (
                  <li key={t.id} className="flex items-start gap-3 py-2.5">
                    <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white" title={t.content}>{t.content}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {t.user_email} · {fmtTime(t.created_at)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-200">
                      <v.Icon className="h-3.5 w-3.5" style={{ color: v.color }} aria-hidden />
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