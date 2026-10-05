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
  X,
  Search,
  Trash2,
} from 'lucide-react';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function ScanHistory({
  open = false,
  onClose,
  refreshTrigger = 0,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = ENDPOINTS?.SCAN_HISTORY || '/api/scan/history';
      const response = await api.get(endpoint);

      setHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to retrieve scan history.'
      );
    } finally {
      setLoading(false);
    }
  }, []);


  const deleteScan = async (scanId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this scan history record?'
    );

    if (!confirmed) return;

    setDeletingId(scanId);
    setError('');

    try {
      const endpoint = `${
        ENDPOINTS?.SCAN_HISTORY || '/api/scan/history'
      }/${scanId}`;

      await api.delete(endpoint);

      setHistory((currentHistory) =>
        currentHistory.filter((scan) => scan.id !== scanId)
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to delete the scan history record.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearHistory = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear your entire scan history? This action cannot be undone.'
    );

    if (!confirmed) return;

    setClearing(true);
    setError('');

    try {
      const endpoint =
        ENDPOINTS?.SCAN_HISTORY || '/api/scan/history';

      await api.delete(endpoint);

      setHistory([]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to clear scan history.'
      );
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory, refreshTrigger]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const parseTarget = (content) => {
    if (
      typeof content === 'string' &&
      content.startsWith('[EMAIL]')
    ) {
      const clean = content.replace('[EMAIL]', '').trim();
      const parts = clean.split('|');

      return {
        type: 'email',
        primary: parts[0]?.trim() || 'Email Analysis',
        secondary: parts[1]?.trim() || '',
      };
    }

    return {
      type: 'url',
      primary: content || 'Unknown Target',
      secondary: '',
    };
  };

  const getVerdictStyle = (result) => {
    const value = (result || '').toLowerCase();

    if (value === 'phishing') {
      return {
        Icon: ShieldX,
        badge:
          'bg-red-500/10 text-red-400 border-red-500/25',
        iconBg: 'bg-red-500/10',
      };
    }

    if (value === 'suspicious') {
      return {
        Icon: ShieldAlert,
        badge:
          'bg-amber-500/10 text-amber-400 border-amber-500/25',
        iconBg: 'bg-amber-500/10',
      };
    }

    return {
      Icon: ShieldCheck,
      badge:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      iconBg: 'bg-emerald-500/10',
    };
  };

  const getRiskStyle = (risk) => {
    const value = (risk || '').toLowerCase();

    if (value === 'high' || value === 'critical') {
      return 'text-red-400';
    }

    if (value === 'medium') {
      return 'text-amber-400';
    }

    if (value === 'low') {
      return 'text-emerald-400';
    }

    return 'text-slate-400';
  };

  const filteredHistory = history.filter((scan) => {
    if (filter === 'all') return true;

    const target = parseTarget(scan.content);

    return target.type === filter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-white">
                Scan History
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Review your recent security inspections.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scan history"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'url', label: 'URLs' },
              { value: 'email', label: 'Emails' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={classNames(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition',
                  filter === item.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-200'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {filteredHistory.length}{' '}
              {filteredHistory.length === 1 ? 'record' : 'records'}
            </span>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                disabled={clearing || loading}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2
                  className={classNames(
                    'h-3.5 w-3.5',
                    clearing && 'animate-pulse'
                  )}
                />
                {clearing ? 'Clearing...' : 'Clear All'}
              </button>
            )}

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw
                className={classNames(
                  'h-3.5 w-3.5',
                  loading && 'animate-spin text-blue-400'
                )}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* History content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && history.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <RotateCw className="h-6 w-6 animate-spin text-blue-400" />
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Loading scan history
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Retrieving your recent security records...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <ShieldX className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-medium text-red-300">
                Unable to load history
              </p>

              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchHistory}
                className="mt-4 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                Try Again
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-600">
                <Search className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-400">
                No scan records found
              </p>

              <p className="mt-1 max-w-sm text-xs text-slate-600">
                {history.length === 0
                  ? 'Run a URL or email analysis to create your first history record.'
                  : 'There are no records matching the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((scan) => {
                const target = parseTarget(scan.content);
                const verdict = getVerdictStyle(scan.result);

                const formattedDate = new Date(
                  scan.created_at
                ).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const formattedTime = new Date(
                  scan.created_at
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={scan.id}
                    className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      {/* Target */}
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={classNames(
                            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800',
                            target.type === 'email'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-blue-500/10 text-blue-400'
                          )}
                        >
                          {target.type === 'email' ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {target.type}
                            </span>

                            <span className="text-[10px] text-slate-700">
                              #{scan.id}
                            </span>
                          </div>

                          <p
                            className="mt-1 truncate font-mono text-sm text-slate-200"
                            title={target.primary}
                          >
                            {target.primary}
                          </p>

                          {target.secondary && (
                            <p
                              className="mt-0.5 truncate text-xs text-slate-500"
                              title={target.secondary}
                            >
                              {target.secondary}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Result information */}
                      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
                        <span
                          className={classNames(
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            verdict.badge
                          )}
                        >
                          <verdict.Icon className="h-3 w-3" />
                          {scan.result || 'Unknown'}
                        </span>

                        <span
                          className={classNames(
                            'text-[10px] font-bold uppercase tracking-wider',
                            getRiskStyle(scan.risk_level)
                          )}
                        >
                          {scan.risk_level || 'Unknown'} Risk
                        </span>

                        <div className="text-left lg:min-w-32 lg:text-right">
                          <p className="text-[11px] text-slate-400">
                            {formattedDate}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-600">
                            {formattedTime}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteScan(scan.id)}
                          disabled={deletingId === scan.id || clearing}
                          aria-label={`Delete scan ${scan.id}`}
                          title="Delete this scan"
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2
                            className={classNames(
                              'h-3.5 w-3.5',
                              deletingId === scan.id && 'animate-pulse'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}