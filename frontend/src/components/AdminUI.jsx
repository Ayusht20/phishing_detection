'use client';

import { useEffect, useRef, useState } from 'react';

export const cn = (...values) => values.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* useCountUp: eases a number from its previous value to the new one   */
/* ------------------------------------------------------------------ */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    const to = Number(target) || 0;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || from === to) {
      setValue(to);
      previous.current = to;
      return;
    }

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        previous.current = to;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Segmented: tab-like control with a sliding highlight                */
/* ------------------------------------------------------------------ */
export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}) {
  const count = options.length;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative grid rounded-lg border border-slate-800 bg-slate-950 p-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-md bg-blue-600 shadow-sm shadow-blue-600/30 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200',
            value === option.value
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar: initials on a gradient picked deterministically from a seed */
/* ------------------------------------------------------------------ */
const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

function hashString(input) {
  let hash = 0;
  for (const char of String(input)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function Avatar({
  name = '',
  seed,
  className = 'h-9 w-9 text-xs',
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?';

  const gradient = GRADIENTS[hashString(seed ?? name) % GRADIENTS.length];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-inner ring-1 ring-white/10',
        gradient,
        className
      )}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Time helper                                                         */
/* ------------------------------------------------------------------ */
export function timeAgo(iso) {
  if (!iso) return '';

  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  // Clamp negatives (clock skew) to "just now"
  if (Number.isNaN(seconds) || seconds < 45) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}