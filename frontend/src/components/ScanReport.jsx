'use client';

import { useState } from 'react';
import { DownloadReportButton } from '@/components/DownloadReportButton';
import { getRiskStyle, getVerdictStyle, parseTarget } from '@/lib/scanUtils';

const RECOMMENDATIONS = {
  phishing:
    'Do not open this link or reply to this message. If you already interacted with it, change any affected passwords and report it to your IT or security team.',
  suspicious:
    'Treat this with caution. Avoid entering credentials or downloading files until you can verify the source through another channel.',
  safe: 'No phishing indicators were found. Stay alert, since automated checks cannot catch every threat.',
};

const CSS = `
@keyframes srIn {
  from { opacity: 0; transform: translateY(12px) }
  to { opacity: 1; transform: none }
}
.sr-in { animation: srIn .4s cubic-bezier(.22,1,.36,1) both }
@media (prefers-reduced-motion: reduce) { .sr-in { animation: none } }
`;

/**
 * Shows the result of a scan with a download option.
 *
 * `scan` should be the saved scan record: { id, content, result, risk_level,
 * created_at }. Optional: `reasons` (array of strings) is listed if present.
 */
export default function ScanReport({ scan, className = '' }) {
  const [error, setError] = useState('');

  if (!scan) return null;

  const target = parseTarget(scan.content);
  const verdict = getVerdictStyle(scan.result);
  const advice =
    RECOMMENDATIONS[(scan.result || '').toLowerCase()] ||
    'Review this result carefully before taking any action.';

  const scannedAt = scan.created_at
    ? new Date(scan.created_at).toLocaleString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const reasons = Array.isArray(scan.reasons) ? scan.reasons : [];

  const rows = [
    { label: 'Type', value: target.type === 'email' ? 'Email' : 'URL' },
    { label: 'Target', value: target.primary, mono: true },
    target.secondary && { label: 'Details', value: target.secondary },
    scan.id && { label: 'Scan ID', value: `#${scan.id}` },
    scannedAt && { label: 'Scanned at', value: scannedAt },
  ].filter(Boolean);

  return (
    <section
      aria-label="Scan report"
      className={`sr-in relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 ${className}`}
    >
      <style>{CSS}</style>

      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${verdict.accent}`}
      />

      {/* Verdict */}
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl border ${verdict.badge}`}
          >
            <verdict.Icon className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs text-slate-500">Scan report</p>
            <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
              {scan.result || 'Unknown'}
            </h3>
          </div>
        </div>

        <p
          className={`text-xs font-bold uppercase tracking-wider ${getRiskStyle(
            scan.risk_level
          )}`}
        >
          {scan.risk_level || 'Unknown'} risk
        </p>
      </div>

      {/* Details */}
      <dl className="divide-y divide-slate-800/70 px-5 sm:px-6">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[120px_1fr] sm:gap-4"
          >
            <dt className="text-xs text-slate-500">{row.label}</dt>
            <dd
              className={`min-w-0 break-all text-sm text-slate-200 ${
                row.mono ? 'font-mono' : ''
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {reasons.length > 0 && (
        <div className="px-5 pt-4 sm:px-6">
          <p className="text-xs font-semibold text-slate-300">
            Why this verdict
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
            {reasons.map((reason, index) => (
              <li key={index}>{String(reason)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div className="m-5 rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:mx-6">
        <p className="text-xs font-semibold text-slate-300">
          Recommended action
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{advice}</p>
      </div>

      {/* Download */}
      <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs">
          {error ? (
            <span role="alert" className="text-red-400">
              {error}
            </span>
          ) : (
            <span className="text-slate-500">
              Save a PDF copy of this report.
            </span>
          )}
        </p>

        <DownloadReportButton
          scanId={scan.id}
          variant="button"
          onError={setError}
          onSuccess={() => setError('')}
        />
      </div>
    </section>
  );
}