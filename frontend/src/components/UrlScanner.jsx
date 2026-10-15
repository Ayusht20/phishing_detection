'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';
import { DownloadReportButton, resolveScanId } from '@/components/DownloadReportButton';
import {
  Link2,
  Loader2,
  AlertTriangle,
  Radar,
  Target,
  ShieldCheck,
} from 'lucide-react';
import {
  classNames,
  verdictMeta,
  riskLevelMeta,
  InfoTooltip,
  AnalysisLoader,
  EmptyPanel,
} from '@/components/scanner-common';

const URL_SCORE_INFO = [
  'Checked against Google Safe Browsing threat databases for verified malware and phishing paths.',
  'Cross-referenced with VirusTotal aggregated reputation telemetry from multivendor antivirus engines.',
  'Structural heuristics: URL shortener obfuscation, raw IP formats, insecure HTTP schemes, and risky domain endings.',
];

const URL_SCAN_STEPS = [
  'Resolving domain & redirects',
  'Checking reputation feeds',
  'Analyzing structural heuristics',
];

export default function UrlScanner({ onScanComplete }) {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState(null);
  const [urlScanId, setUrlScanId] = useState(null);
  const [urlError, setUrlError] = useState('');

  const handleScanUrl = async (e) => {
    e.preventDefault();
    setUrlError('');
    setUrlResult(null);
    setUrlScanId(null);

    const token = localStorage.getItem('token');
    if (!token) return router.replace('/login');

    setUrlLoading(true);
    try {
      const response = await api.post(ENDPOINTS.SCAN_URL, {
        url: urlInput.trim(),
      });
      setUrlResult(response.data);
      if (onScanComplete) onScanComplete(response.data);

      resolveScanId(response.data).then(setUrlScanId);
    } catch (err) {
      if (err.response?.status === 429) {
        setUrlError(
          'Rate limit reached: Maximum 5 scans per minute. Please wait a moment before trying again.'
        );
      } else {
        setUrlError(
          err.response?.data?.detail || 'Failed to scan URL. Please verify server status.'
        );
      }
    } finally {
      setUrlLoading(false);
    }
  };

  const urlVerdict = urlResult ? verdictMeta(urlResult.result) : null;
  const urlRisk = urlResult ? riskLevelMeta(urlResult.risk_level) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Scanner Form Container */}
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
          <EmptyPanel
            Icon={Radar}
            text="Submit a link above to see its verdict, risk level, and target breakdown here."
          />
        )}
      </div>

      {/* Verdict Side Panel */}
      <div
        className={classNames(
          'rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm transition-shadow lg:col-span-2',
          urlResult && urlVerdict?.glowClass
        )}
      >
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {urlLoading ? 'Analyzing…' : 'Scan Verdict'}
          {!urlLoading && (
            <InfoTooltip title="How this verdict is calculated" items={URL_SCORE_INFO} />
          )}
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
                  className={classNames(
                    'h-full rounded-full transition-all duration-700',
                    urlRisk.color
                  )}
                  style={{ width: urlRisk.width }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                <Target className="h-3 w-3" /> Target
              </div>
              <p
                className="break-all font-mono text-xs text-slate-300"
                title={urlResult.content}
              >
                {urlResult.content}
              </p>
            </div>

            <DownloadReportButton
              scanId={urlScanId}
              variant="button"
              accent="blue"
              className="w-full"
              onError={setUrlError}
            />
          </div>
        )}
      </div>
    </div>
  );
}