'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';
import {
  History,
  Link2,
  Mail,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ExternalLink,
} from 'lucide-react';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function ScanHistory({ refreshTrigger = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = ENDPOINTS?.SCAN_HISTORY || '/api/scan/history';
      const response = await api.get(endpoint);
      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to retrieve scan logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  // Dissect content string into structured email or URL target
  const parseTarget = (content) => {
    if (typeof content === 'string' && content.startsWith('[EMAIL]')) {
      const clean = content.replace('[EMAIL]', '').trim();
      const parts = clean.split('|');
      return {
        type: 'email',
        primary: parts[0]?.trim() || '(No Subject)',
        secondary: parts[1]?.trim() || '',
      };
    }
    return {
      type: 'url',
      primary: content || 'Unknown Target',
      secondary: null,
    };
  };

  const getVerdictStyle = (result) => {
    const val = (result || '').toLowerCase();
    if (val === 'phishing') {
      return {
        Icon: ShieldX,
        badge: 'bg-red-500/15 text-red-400 border-red-500/30',
      };
    }
    if (val === 'suspicious') {
      return {
        Icon: ShieldAlert,
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    }
    return {
      Icon: ShieldCheck,
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Inspection Logs</h3>
            <p className="text-xs text-slate-400">Audit trail of previously analyzed URLs and email payloads.</p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white disabled:opacity-50"
        >
          <RotateCw className={classNames('h-3.5 w-3.5', loading && 'animate-spin text-blue-400')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Container */}
      {loading && history.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <RotateCw className="h-4 w-4 animate-spin text-slate-400" />
          <span>Loading historical audit records...</span>
        </div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-400 border border-red-900/40 rounded-xl bg-red-950/20">
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40">
          No scans recorded yet. Perform a scan above to populate your telemetry log.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
              <tr>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Inspected Target</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map((scan) => {
                const target = parseTarget(scan.content);
                const verdict = getVerdictStyle(scan.result);

                return (
                  <tr key={scan.id} className="transition hover:bg-slate-800/40">
                    {/* Channel */}
                    <td className="whitespace-nowrap py-3 px-4">
                      {target.type === 'email' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-blue-400 font-medium">
                          <Link2 className="h-3.5 w-3.5" /> URL
                        </span>
                      )}
                    </td>

                    {/* Inspected Content */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-mono text-slate-200 truncate" title={target.primary}>
                        {target.primary}
                      </div>
                      {target.secondary && (
                        <div className="text-[11px] text-slate-500 truncate" title={target.secondary}>
                          {target.secondary}
                        </div>
                      )}
                    </td>

                    {/* Verdict */}
                    <td className="whitespace-nowrap py-3 px-4">
                      <span
                        className={classNames(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                          verdict.badge
                        )}
                      >
                        <verdict.Icon className="h-3 w-3" />
                        {scan.result}
                      </span>
                    </td>

                    {/* Risk Level */}
                    <td className="whitespace-nowrap py-3 px-4 text-[11px] font-semibold uppercase text-slate-400">
                      {scan.risk_level || 'N/A'}
                    </td>

                    {/* Date / Time */}
                    <td className="whitespace-nowrap py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(scan.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(scan.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}