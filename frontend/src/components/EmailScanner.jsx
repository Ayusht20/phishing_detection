'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';
import { DownloadReportButton, resolveScanId } from '@/components/DownloadReportButton';
import {
  Mail,
  Loader2,
  AlertTriangle,
  Radar,
  Gauge as GaugeIcon,
  ShieldCheck,
} from 'lucide-react';
import {
  classNames,
  verdictMeta,
  InfoTooltip,
  ScoreGauge,
  AnalysisLoader,
  EmptyPanel,
} from '@/components/scanner-common';

const EMAIL_SCORE_INFO = [
  'Weighted keyword indicators: urgency language, account suspension threats, OTP/credential queries, and prize/payment lures.',
  'Embedded hyperlinks audited for URL shorteners, risky TLDs, and insecure transport.',
  'Sender domain verification comparing claimed enterprise identity against free/public email providers.',
  'Deep semantic evaluation by proprietary Neural AI models inspecting structural context and confidence levels.',
];

const EMAIL_SCAN_STEPS = [
  'Parsing sender & headers',
  'Scanning language for urgency cues',
  'Auditing embedded links',
];

export default function EmailScanner({ onScanComplete }) {
  const router = useRouter();
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [emailScanId, setEmailScanId] = useState(null);
  const [emailError, setEmailError] = useState('');

  const handleScanEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailResult(null);
    setEmailScanId(null);

    const token = localStorage.getItem('token');
    if (!token) return router.replace('/login');

    setEmailLoading(true);
    try {
      const response = await api.post(ENDPOINTS.SCAN_EMAIL, {
        sender: sender.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      setEmailResult(response.data);
      if (onScanComplete) onScanComplete(response.data);

      resolveScanId(response.data).then(setEmailScanId);
    } catch (err) {
      if (err.response?.status === 429) {
        setEmailError(
          'Rate limit reached: Maximum 5 scans per minute. Please wait a moment before trying again.'
        );
      } else {
        setEmailError(
          err.response?.data?.detail || 'Failed to analyze email content.'
        );
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const emailVerdict = emailResult ? verdictMeta(emailResult.result) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Email Analyzer Form */}
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
            <h2 className="text-lg font-semibold text-white">Email Threat Inspection</h2>
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
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 text-xs leading-relaxed text-slate-300">
              <strong className="mb-1 block text-white">Executive Summary:</strong>
              {emailResult.summary}
            </div>

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
          <EmptyPanel
            Icon={Radar}
            text="Submit an email above to see its threat score, red flags, and link breakdown here."
          />
        )}
      </div>

      {/* Outcome Side Panel */}
      <div
        className={classNames(
          'rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm transition-shadow lg:col-span-2',
          emailResult && emailVerdict?.glowClass
        )}
      >
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <GaugeIcon className="h-3.5 w-3.5" /> {emailLoading ? 'Analyzing…' : 'Threat Outcome'}
          {!emailLoading && (
            <InfoTooltip title="How this score is calculated" items={EMAIL_SCORE_INFO} />
          )}
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

            <DownloadReportButton
              scanId={emailScanId}
              variant="button"
              accent="emerald"
              className="w-full"
              onError={setEmailError}
            />
          </div>
        )}
      </div>
    </div>
  );
}