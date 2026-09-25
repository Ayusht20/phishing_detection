'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Link2,
  Mail,
  Gauge,
  History,
  ArrowUpRight,
  Menu,
  X,
  Radar,
  Zap,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GitHub,
  Twitter,
  Linkedin,
} from 'lucide-react';

import {
  FaGithub,
  FaTwitter,
  FaLinkedin,
} from 'react-icons/fa';
// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Results', href: '#results' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  {
    title: 'URL Scanner',
    description:
      'Every link is checked against live reputation feeds and structural heuristics before your team ever clicks it.',
    Icon: Link2,
    accent: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  },
  {
    title: 'Email Threat Analyzer',
    description:
      'Sender, subject, and body are parsed together to catch spoofed domains and manufactured urgency, not just bad links.',
    Icon: Mail,
    accent: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
  },
  {
    title: 'Verdict Engine',
    description:
      'A weighted score turns raw signals into one clear call — safe, suspicious, or phishing — in under a second.',
    Icon: Gauge,
    accent: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  },
  {
    title: 'Full Scan History',
    description:
      'Every scan your team runs is logged and searchable, so nothing that touched an inbox is ever untraceable.',
    Icon: History,
    accent: 'text-violet-400 bg-violet-500/10 ring-violet-500/20',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Drop in a link or email',
    description:
      'Paste a URL or the full contents of a suspicious email — no forwarding, no plugins, no setup.',
  },
  {
    number: '02',
    title: 'PhishGuard scores it',
    description:
      'Reputation engines, domain heuristics, and language analysis run in parallel and return a single threat score.',
  },
  {
    number: '03',
    title: 'Act on the verdict',
    description:
      'Get a clear SAFE, SUSPICIOUS, or PHISHING call with the evidence behind it, logged to your team\u2019s history.',
  },
];

const STATS = [
  { value: '98.7%', label: 'Detection accuracy on known phishing sets' },
  { value: '<400ms', label: 'Average time to verdict per scan' },
  { value: '12M+', label: 'URLs and messages scanned to date' },
  { value: '24/7', label: 'Continuous threat feed updates' },
];

const FEED_ITEMS = [
  { target: 'secure-paypal-verify.com', verdict: 'PHISHING', score: 94 },
  { target: 'invoice_update_072.pdf.link', verdict: 'PHISHING', score: 88 },
  { target: 'accounts.google.com', verdict: 'SAFE', score: 3 },
  { target: 'hr-benefits-portal-2026.net', verdict: 'SUSPICIOUS', score: 61 },
  { target: 'github.com/anthropics', verdict: 'SAFE', score: 2 },
  { target: 'wire-transfer-confirm.biz', verdict: 'PHISHING', score: 97 },
];

const VERDICT_STYLES = {
  SAFE: { text: 'text-emerald-400', dot: 'bg-emerald-400', Icon: CheckCircle2 },
  SUSPICIOUS: { text: 'text-amber-400', dot: 'bg-amber-400', Icon: AlertTriangle },
  PHISHING: { text: 'text-red-400', dot: 'bg-red-400', Icon: XCircle },
};

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function LiveFeedPanel() {
  const [rows, setRows] = useState(FEED_ITEMS.slice(0, 4));
  const cursorRef = useRef(4);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = FEED_ITEMS[cursorRef.current % FEED_ITEMS.length];
      cursorRef.current += 1;
      setRows((prev) => [next, ...prev.slice(0, 3)]);
    }, 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-blue-950/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
          </span>
          live scan feed
        </div>
      </div>
      <ul className="divide-y divide-slate-800/70">
        {rows.map((item, idx) => {
          const style = VERDICT_STYLES[item.verdict];
          const { Icon } = style;
          return (
            <li
              key={`${item.target}-${idx}`}
              className={classNames(
                'flex items-center justify-between gap-3 px-4 py-3 text-sm',
                idx === 0 && 'animate-[fadeIn_0.4s_ease-out]'
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className={classNames('h-4 w-4 flex-shrink-0', style.text)} />
                <span className="truncate font-mono text-xs text-slate-300">
                  {item.target}
                </span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-xs text-slate-600">{item.score}</span>
                <span className={classNames('text-[11px] font-semibold', style.text)}>
                  {item.verdict}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-600">
        Sample feed for demonstration — connect your account to see live results.
      </div>
    </div>
  );
}

function RadarMark({ className }) {
  return (
    <div className={classNames('relative flex items-center justify-center', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
        <ShieldCheck className="h-1/2 w-1/2 text-blue-400" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <RadarMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-tight text-slate-100">
              PhishGuard
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-slate-100"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Get started free
            </Link>
          </div>

          <button
            className="text-slate-400 md:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-slate-800 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3.5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="text-sm text-slate-300"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2.5 border-t border-slate-800 pt-4">
                <Link href="/login" className="text-sm font-medium text-slate-300">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get started free
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section id="product" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />

          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-400">
                <Zap className="h-3 w-3 text-blue-400" />
                Verdicts in under half a second
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Catch phishing before your team
                <span className="text-blue-400"> does the clicking.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
                PhishGuard scores URLs and emails against live threat intelligence
                and language analysis, so a suspicious link never has to be a
                guessing game.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Start scanning free
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-700"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex items-center gap-5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Full scan transparency
                </span>
              </div>
            </div>

            <LiveFeedPanel />
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <p className="text-center text-xs uppercase tracking-wider text-slate-600">
              Built for security teams, MSSPs, and fintechs handling inboxes at scale
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
              One console, every angle of a threat
            </h2>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">
              PhishGuard doesn&apos;t stop at a single red flag. Each scan pulls
              together reputation data, structural signals, and language patterns
              into one verdict you can act on.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map(({ title, description, Icon, accent }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"
              >
                <div
                  className={classNames(
                    'flex h-10 w-10 items-center justify-center rounded-lg ring-1',
                    accent
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                From suspicious to certain in three steps
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {STEPS.map((step, idx) => (
                <div key={step.number} className="relative">
                  <span className="text-5xl font-bold text-slate-800">
                    {step.number}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                  {idx < STEPS.length - 1 && (
                    <div className="mt-8 hidden h-px w-full bg-gradient-to-r from-slate-800 to-transparent md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section id="results" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="font-mono text-3xl font-bold text-blue-400 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="border-y border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <Radar className="mx-auto h-8 w-8 text-blue-400" />
            <p className="mt-6 text-xl font-medium leading-relaxed text-slate-200 sm:text-2xl">
              We stopped forwarding suspicious emails around the team and just
              started pasting them into PhishGuard. The verdict and the reasoning
              behind it both show up in seconds.
            </p>
            <p className="mt-6 text-sm text-slate-500">
              Security Lead, mid-market fintech
            </p>
          </div>
        </section>

        {/* Pricing teaser / CTA */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[32rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                Give your inbox a second opinion
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
                Free for individual scanning. Team plans add shared history,
                role-based access, and API access for your own tools.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Start scanning free
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-700"
                >
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <RadarMark className="h-7 w-7" />
              <span className="text-sm font-bold text-slate-200">PhishGuard</span>
            </div>

          </div>
          <div className="mt-8 flex flex-col justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-600 sm:flex-row">
            <p>© {new Date().getFullYear()} PhishGuard. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-slate-400">Privacy</a>
              <a href="#" className="hover:text-slate-400">Terms</a>
              <a href="#" className="hover:text-slate-400">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}