'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Radar,
  CheckCircle2,
  CircleDashed,
  Info,
} from 'lucide-react';

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function verdictMeta(result) {
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

export function riskLevelMeta(level) {
  const value = (level || '').toString().toLowerCase();
  if (value === 'critical') return { width: '100%', color: 'bg-red-500', text: 'text-red-400' };
  if (value === 'high') return { width: '85%', color: 'bg-red-500', text: 'text-red-400' };
  if (value === 'medium') return { width: '55%', color: 'bg-amber-500', text: 'text-amber-400' };
  if (value === 'low') return { width: '25%', color: 'bg-emerald-500', text: 'text-emerald-400' };
  return { width: '10%', color: 'bg-slate-600', text: 'text-slate-400' };
}

export function InfoTooltip({ title, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="How this score is calculated"
        className={classNames(
          'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
          open
            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
            : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
        )}
      >
        <Info className="h-2.5 w-2.5" />
      </button>

      {open && (
        <div
          className={classNames(
            'absolute top-6 z-20 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left shadow-xl',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <p className="text-xs font-semibold text-slate-200">{title}</p>
          <ul className="mt-2 space-y-1.5">
            {items.map((item) => (
              <li key={item} className="flex gap-1.5 text-[11px] leading-relaxed text-slate-400">
                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-slate-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ScoreGauge({ score = 0 }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const meta = verdictMeta(clamped >= 60 ? 'phishing' : clamped >= 30 ? 'suspicious' : 'safe');
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-800"
        />
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

export function AnalysisLoader({ active, steps, accent }) {
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
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div
          className={classNames(
            'absolute h-full w-full animate-spin rounded-full border-2 border-transparent',
            accent === 'blue' ? 'border-t-blue-400' : 'border-t-emerald-400'
          )}
          style={{ animationDuration: '0.9s' }}
        />
        <Radar
          className={classNames('h-7 w-7', accent === 'blue' ? 'text-blue-400' : 'text-emerald-400')}
        />
      </div>

      <ul className="mt-5 w-full space-y-2.5">
        {steps.map((step, idx) => {
          const done = idx < stepIndex;
          const current = idx === stepIndex;
          return (
            <li key={step} className="flex items-center gap-2.5 text-xs">
              {done ? (
                <CheckCircle2
                  className={classNames(
                    'h-3.5 w-3.5 flex-shrink-0',
                    accent === 'blue' ? 'text-blue-400' : 'text-emerald-400'
                  )}
                />
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

export function EmptyPanel({ Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 py-10 text-center">
      <Icon className="h-8 w-8 text-slate-700" />
      <p className="mt-3 max-w-xs text-xs text-slate-500">{text}</p>
    </div>
  );
}