'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Link2,
  Mail,
  LogOut,
  Loader2,
  AlertTriangle,
  Radar,
  Cpu,
  Target,
  Gauge as GaugeIcon,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function RadarMark({ className = 'h-9 w-9' }) {
  return (
    <div className={classNames('relative flex items-center justify-center', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/10 ring-1 ring-blue-500/30">
        <ShieldCheck className="h-1/2 w-1/2 text-blue-400" />
      </div>
    </div>
  );
}

function verdictMeta(result) {
  const value = (result || '').toString().toLowerCase();
  if (value === 'phishing') {
    return {
      Icon: ShieldX,
      badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
      ringClass: 'ring-red-500/30',
      barClass: 'bg-red-500',
      glowClass: 'shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)]',
    };
  }
  if (value === 'suspicious') {
    return {
      Icon: ShieldAlert,
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      ringClass: 'ring-amber-500/30',
      barClass: 'bg-amber-500',
      glowClass: 'shadow-[0_0_40px_-8px_rgba(245,158,11,0.45)]',
    };
  }
  return {
    Icon: ShieldCheck,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    ringClass: 'ring-emerald-500/30',
    barClass: 'bg-emerald-500',
    glowClass: 'shadow-[0_0_40px_-8px_rgba(16,185,129,0.45)]',
  };
}

// Purely presentational: turns a risk_level string into a fill width/color for
// the meter. Doesn't touch or reshape the underlying API data.
function riskLevelMeta(level) {
  const value = (level || '').toString().toLowerCase();
  if (value === 'critical') return { width: '100%', color: 'bg-red-500', text: 'text-red-400' };
  if (value === 'high') return { width: '85%', color: 'bg-red-500', text: 'text-red-400' };
  if (value === 'medium') return { width: '55%', color: 'bg-amber-500', text: 'text-amber-400' };
  if (value === 'low') return { width: '25%', color: 'bg-emerald-500', text: 'text-emerald-400' };
  return { width: '10%', color: 'bg-slate-600', text: 'text-slate-400' };
}

function ScoreGauge({ score = 0 }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const meta = verdictMeta(clamped >= 60 ? 'phishing' : clamped >= 30 ? 'suspicious' : 'safe');
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={classNames('transition-all duration-700 ease-out', meta.barClass.replace('bg-', 'text-'))}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-100">{clamped}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

// Cosmetic "in progress" checklist. Cycles through the given step labels while
// `active` is true. Purely a visual holder for wait time — it does not gate,
// delay, or otherwise touch the real axios request or its result.
function AnalysisLoader({ active, steps, accent }) {
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return undefined;
    }
    timerRef.current = setInterval(() => {
      setStepIndex((prev) => (prev + 1 < steps.length ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(timerRef.current);
  }, [active, steps.length]);

  if (!active) return null;

  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div
          className={classNames(
            'absolute h-full w-full animate-spin rounded-full',
            accent === 'blue'
              ? 'bg-[conic-gradient(from_0deg,transparent_0deg,rgba(59,130,246,0.55)_60deg,transparent_120deg)]'
              : 'bg-[conic-gradient(from_0deg,transparent_0deg,rgba(16,185,129,0.55)_60deg,transparent_120deg)]'
          )}
          style={{ animationDuration: '1.6s' }}
        />
        <div className="absolute h-[86%] w-[86%] rounded-full bg-slate-900" />
        <Radar
          className={classNames(
            'relative h-8 w-8 animate-pulse',
            accent === 'blue' ? 'text-blue-400' : 'text-emerald-400'
          )}
        />
      </div>

      <ul className="mt-5 w-full space-y-2.5">
        {steps.map((step, idx) => {
          const done = idx < stepIndex;
          const current = idx === stepIndex;
          return (
            <li key={step} className="flex items-center gap-2.5 text-xs">
              {done ? (
                <CheckCircle2 className={classNames('h-3.5 w-3.5 flex-shrink-0', accent === 'blue' ? 'text-blue-400' : 'text-emerald-400')} />
              ) : current ? (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-slate-400" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5 flex-shrink-0 text-slate-700" />
              )}
              <span className={classNames(done || current ? 'text-slate-300' : 'text-slate-600')}>
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyPanel({ Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-700" />
      <p className="mt-3 max-w-xs text-xs text-slate-500">{text}</p>
    </div>
  );
}

const URL_SCAN_STEPS = [
  'Resolving domain & redirects',
  'Checking reputation feeds',
  'Analyzing structural heuristics',
];

const EMAIL_SCAN_STEPS = [
  'Parsing sender & headers',
  'Scanning language for urgency cues',
  'Auditing embedded links',
];

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('url'); // 'url' or 'email'

  // URL Scanner State
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState(null);
  const [urlError, setUrlError] = useState('');

  // Email Scanner State
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');

    if (!token) {
      router.replace('/login');
    } else {
      setUserName(name || 'Security Analyst');
      setIsChecking(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.replace('/login');
  };

  const handleScanUrl = async (e) => {
    e.preventDefault();
    setUrlError('');
    setUrlResult(null);

    const token = localStorage.getItem('token');
    if (!token) return router.replace('/login');

    setUrlLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:8000/api/scan/url',
        { url: urlInput.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setUrlResult(response.data);
    } catch (err) {
      setUrlError(err.response?.data?.detail || 'Failed to scan URL. Please verify server status.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleScanEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailResult(null);

    const token = localStorage.getItem('token');
    if (!token) return router.replace('/login');

    setEmailLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:8000/api/scan/email',
        {
          sender: sender.trim(),
          subject: subject.trim(),
          body: body.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setEmailResult(response.data);
    } catch (err) {
      setEmailError(err.response?.data?.detail || 'Failed to analyze email content.');
    } finally {
      setEmailLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Radar className="h-8 w-8 animate-pulse text-blue-400" />
          <p className="text-sm text-slate-500">Verifying active session…</p>
        </div>
      </div>
    );
  }

  const urlVerdict = urlResult ? verdictMeta(urlResult.result) : null;
  const urlRisk = urlResult ? riskLevelMeta(urlResult.risk_level) : null;
  const emailVerdict = emailResult ? verdictMeta(emailResult.result) : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 font-sans text-slate-100">
      {/* Ambient background texture, purely decorative */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-[36rem] rounded-full bg-blue-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-80 w-[30rem] rounded-full bg-emerald-600/10 blur-[130px]" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <RadarMark className="h-8 w-8" />
            <div className="flex items-baseline gap-2">
              <span className="bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-sm font-bold tracking-tight text-transparent">
                PhishGuard
              </span>
              <span className="text-xs font-normal text-slate-500">Threat Console</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 py-1 pl-1 pr-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400">
                {userName.trim().charAt(0).toUpperCase() || 'S'}
              </span>
              <span className="text-sm font-medium text-slate-300">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-500/40 hover:bg-red-950/60 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl space-y-6 p-6">
        {/* Segmented tab switcher */}
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 p-1">
          <button
            onClick={() => setActiveTab('url')}
            className={classNames(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all',
              activeTab === 'url'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Link2 className="h-4 w-4" />
            URL Scanner
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={classNames(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all',
              activeTab === 'email'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Mail className="h-4 w-4" />
            AI Threat Analyzer
          </button>
        </div>

        {/* URL SCANNER TAB */}
        {activeTab === 'url' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="relative space-y-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm lg:col-span-3">
              <div
                className={classNames(
                  'absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent',
                  urlLoading && 'animate-pulse'
                )}
              />
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <Link2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">URL Threat Inspection</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Evaluates links against concurrent threat intelligence databases in real time.
                  </p>
                </div>
              </div>

              <form onSubmit={handleScanUrl} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    type="url"
                    required
                    disabled={urlLoading}
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://testsafebrowsing.appspot.com/s/phishing.html"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={urlLoading}
                  className="flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800/60"
                >
                  {urlLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {urlLoading ? 'Scanning...' : 'Scan URL'}
                </button>
              </form>

              {urlError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-800/60 bg-red-950/40 p-3.5 text-xs text-red-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}

              {!urlResult && !urlError && !urlLoading && (
                <EmptyPanel Icon={Radar} text="Submit a link above to see its verdict, risk level, and target breakdown here." />
              )}
            </div>

            {/* Verdict side panel */}
            <div
              className={classNames(
                'rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm transition-shadow lg:col-span-2',
                urlResult && urlVerdict.glowClass
              )}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {urlLoading ? 'Analyzing…' : 'Scan Verdict'}
              </h3>

              {urlLoading ? (
                <AnalysisLoader active={urlLoading} steps={URL_SCAN_STEPS} accent="blue" />
              ) : !urlResult ? (
                <div className="mt-4 flex h-full flex-col items-center justify-center py-6 text-center">
                  <ShieldCheck className="h-8 w-8 text-slate-700" />
                  <p className="mt-3 text-xs text-slate-500">No scan run yet</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div
                    className={classNames(
                      'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wider ring-1',
                      urlVerdict.badgeClass,
                      urlVerdict.ringClass
                    )}
                  >
                    <urlVerdict.Icon className="h-4 w-4" />
                    {urlResult.result}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Risk Level</span>
                      <span className={classNames('font-semibold uppercase', urlRisk.text)}>
                        {urlResult.risk_level}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={classNames('h-full rounded-full transition-all duration-700', urlRisk.color)}
                        style={{ width: urlRisk.width }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                      <Target className="h-3 w-3" /> Target
                    </div>
                    <p className="break-all font-mono text-xs text-slate-300" title={urlResult.content}>
                      {urlResult.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMAIL ANALYZER TAB */}
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="relative space-y-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm lg:col-span-3">
              <div
                className={classNames(
                  'absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent',
                  emailLoading && 'animate-pulse'
                )}
              />
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Mail className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Email Threat Inspection</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Performs deep semantic inspection for social engineering, urgency cues, and embedded links.
                  </p>
                </div>
              </div>

              <form onSubmit={handleScanEmail} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Sender / From Address</label>
                    <input
                      type="text"
                      disabled={emailLoading}
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder="support@service-update-portal.com"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Email Subject</label>
                    <input
                      type="text"
                      disabled={emailLoading}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Urgent: Your access has been restricted"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Email Content / Body</label>
                  <textarea
                    required
                    rows={5}
                    disabled={emailLoading}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Paste email text here..."
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800/60"
                >
                  {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {emailLoading ? 'Running Neural Analysis...' : 'Analyze Email'}
                </button>
              </form>

              {emailError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-800/60 bg-red-950/40 p-3.5 text-xs text-red-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailResult && (
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-5">
                  {/* Analysis Summary */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs leading-relaxed text-slate-300">
                    <strong className="mb-1 block text-white">Executive Summary:</strong>
                    {emailResult.summary}
                  </div>

                  {/* Red Flags */}
                  {emailResult.red_flags?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-400">Identified Indicators:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {emailResult.red_flags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1 rounded-md border border-red-800/40 bg-red-950/50 px-2.5 py-1 text-xs font-medium text-red-300"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links Analysis Breakdown */}
                  {emailResult.links_found?.length > 0 && (
                    <div className="space-y-2 border-t border-slate-800/80 pt-2 text-xs">
                      <span className="font-semibold text-slate-400">
                        Embedded Links Audited ({emailResult.links_found.length}):
                      </span>
                      <ul className="space-y-1">
                        {emailResult.links_found.map((link, idx) => {
                          const isFlagged = emailResult.flagged_links?.includes(link);
                          return (
                            <li
                              key={idx}
                              className={classNames(
                                'flex items-center justify-between rounded-lg p-2 font-mono text-xs',
                                isFlagged
                                  ? 'border border-red-800/50 bg-red-950/40 text-red-300'
                                  : 'border border-slate-800 bg-slate-900 text-slate-300'
                              )}
                            >
                              <span className="max-w-md truncate">{link}</span>
                              <span className="font-sans text-[10px] font-bold uppercase">
                                {isFlagged ? 'Flagged Malicious' : 'Clean'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!emailResult && !emailError && !emailLoading && (
                <EmptyPanel Icon={Radar} text="Submit an email above to see its threat score, red flags, and link breakdown here." />
              )}
            </div>

            {/* Verdict side panel */}
            <div
              className={classNames(
                'rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm transition-shadow lg:col-span-2',
                emailResult && emailVerdict.glowClass
              )}
            >
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <GaugeIcon className="h-3.5 w-3.5" /> {emailLoading ? 'Analyzing…' : 'Threat Outcome'}
              </h3>

              {emailLoading ? (
                <AnalysisLoader active={emailLoading} steps={EMAIL_SCAN_STEPS} accent="emerald" />
              ) : !emailResult ? (
                <div className="mt-4 flex h-full flex-col items-center justify-center py-6 text-center">
                  <ShieldCheck className="h-8 w-8 text-slate-700" />
                  <p className="mt-3 text-xs text-slate-500">No analysis run yet</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center">
                    <ScoreGauge score={emailResult.risk_score} />
                  </div>

                  <div
                    className={classNames(
                      'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold uppercase tracking-wider ring-1',
                      emailVerdict.badgeClass,
                      emailVerdict.ringClass
                    )}
                  >
                    <emailVerdict.Icon className="h-4 w-4" />
                    {emailResult.result}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}