'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Link2,
  Mail,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from 'lucide-react';

const BASE_ENDPOINT = ENDPOINTS?.SCAN_HISTORY || '/api/scan/history';
const PAGE_SIZES = [10, 20, 50];
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'url', label: 'URLs' },
  { value: 'email', label: 'Emails' },
];
const EXIT_MS = 220;
const ROW_REMOVE_MS = 320;

/* ------------------------------------------------------------------ */
/* Styles: keyframes and helpers (no extra dependencies required)      */
/* ------------------------------------------------------------------ */
const CSS = `
@keyframes shOverlayIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes shOverlayOut { from { opacity: 1 } to { opacity: 0 } }
@keyframes shPanelIn {
  from { opacity: 0; transform: translateY(18px) scale(.97) }
  to { opacity: 1; transform: none }
}
@keyframes shPanelOut {
  from { opacity: 1; transform: none }
  to { opacity: 0; transform: translateY(10px) scale(.98) }
}
@keyframes shRowIn {
  from { opacity: 0; transform: translateY(12px) }
  to { opacity: 1; transform: none }
}
@keyframes shPop {
  from { opacity: 0; transform: scale(.92) }
  to { opacity: 1; transform: none }
}
@keyframes shShimmer {
  from { background-position: 200% 0 }
  to { background-position: -200% 0 }
}
@keyframes shProgress {
  from { transform: translateX(-100%) }
  to { transform: translateX(300%) }
}

.sh-overlay-in { animation: shOverlayIn .2s ease-out both }
.sh-overlay-out { animation: shOverlayOut ${EXIT_MS}ms ease-in both }
.sh-panel-in { animation: shPanelIn .35s cubic-bezier(.22,1,.36,1) both }
.sh-panel-out { animation: shPanelOut ${EXIT_MS}ms ease-in both }
.sh-row-in { animation: shRowIn .45s cubic-bezier(.22,1,.36,1) backwards }
.sh-pop { animation: shPop .18s ease-out both }
.sh-progress { animation: shProgress 1.1s ease-in-out infinite }
.sh-shimmer {
  background: linear-gradient(90deg,
    rgba(30,41,59,.45) 25%, rgba(51,65,85,.55) 50%, rgba(30,41,59,.45) 75%);
  background-size: 200% 100%;
  animation: shShimmer 1.5s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sh-overlay-in, .sh-overlay-out, .sh-panel-in, .sh-panel-out,
  .sh-row-in, .sh-pop, .sh-progress, .sh-shimmer { animation: none !important }
  .sh-root * { transition-duration: .01ms !important }
}
`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function parseTarget(content) {
  if (typeof content === 'string' && content.startsWith('[EMAIL]')) {
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
}

function getVerdictStyle(result) {
  const value = (result || '').toLowerCase();

  if (value === 'phishing') {
    return {
      Icon: ShieldX,
      badge: 'bg-red-500/10 text-red-400 border-red-500/25',
      accent: 'bg-red-500',
    };
  }

  if (value === 'suspicious') {
    return {
      Icon: ShieldAlert,
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      accent: 'bg-amber-500',
    };
  }

  return {
    Icon: ShieldCheck,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    accent: 'bg-emerald-500',
  };
}

function getRiskStyle(risk) {
  const value = (risk || '').toLowerCase();

  if (value === 'high' || value === 'critical') return 'text-red-400';
  if (value === 'medium') return 'text-amber-400';
  if (value === 'low') return 'text-emerald-400';
  return 'text-slate-400';
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) {
    return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '…', current - 1, current, current + 1, '…', total];
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
function SkeletonRow({ index }) {
  return (
    <div
      className="sh-row-in rounded-xl border border-slate-800 bg-slate-900/60 p-4"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="sh-shimmer h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="sh-shimmer h-2.5 w-16 rounded" />
            <div className="sh-shimmer h-3.5 w-3/5 rounded" />
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="sh-shimmer h-6 w-24 rounded-md" />
          <div className="sh-shimmer h-6 w-20 rounded-md" />
          <div className="sh-shimmer h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, disabled, onChange }) {
  const pages = getPageRange(page, totalPages);

  const baseButton =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Scan history pages" className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        className={classNames(
          baseButton,
          'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((item, index) =>
        item === '…' ? (
          <span
            key={`gap-${index}`}
            className="flex h-8 w-6 items-center justify-center text-xs text-slate-600"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            disabled={disabled}
            aria-label={`Page ${item}`}
            aria-current={item === page ? 'page' : undefined}
            className={classNames(
              baseButton,
              item === page
                ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        className={classNames(
          baseButton,
          'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-white'
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function ScanHistory({
  open = false,
  onClose,
  refreshTrigger = 0,
}) {
  // Data
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Query state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [filter, setFilter] = useState('all');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Row / bulk actions
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Mount / exit animation
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  // Only show loading visuals if a request takes longer than a moment
  const [showLoading, setShowLoading] = useState(false);

  const listRef = useRef(null);
  const requestRef = useRef(0);
  const fetchRef = useRef(null);

  /* ----------------------------- Fetching ---------------------------- */
  const fetchHistory = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestRef.current;

      if (!silent) setLoading(true);
      setError('');

      try {
        const { data } = await api.get(BASE_ENDPOINT, {
          params: { page, page_size: pageSize, scan_type: filter },
        });

        // Ignore responses from outdated requests
        if (requestId !== requestRef.current) return;

        // Tolerate the old array response as well as the paginated one
        const payload = Array.isArray(data)
          ? { items: data, total: data.length, total_pages: 1 }
          : data;

        setHistory(payload.items ?? []);
        setTotal(payload.total ?? 0);
        setTotalPages(Math.max(1, payload.total_pages ?? 1));
        setHasLoaded(true);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(
          err.response?.data?.detail || 'Unable to retrieve scan history.'
        );
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [page, pageSize, filter]
  );

  // Always points at the latest fetchHistory (safe to call from timeouts)
  fetchRef.current = fetchHistory;

  /* ----------------------------- Effects ----------------------------- */
  // Mount on open, play the exit animation on close
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mounted) return;

    setClosing(true);
    setConfirmClear(false);
    setConfirmingId(null);

    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setPage(1); // reset now so reopening doesn't trigger a second fetch
    }, EXIT_MS);

    return () => clearTimeout(timer);
  }, [open, mounted]);

  // Show loading visuals only after 250ms to avoid flashing on fast requests
  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }

    const timer = setTimeout(() => setShowLoading(true), 250);
    return () => clearTimeout(timer);
  }, [loading]);

  // Jump back to page 1 when a new scan was just made
  useEffect(() => {
    setPage(1);
  }, [refreshTrigger]);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory, refreshTrigger]);

  // If the current page no longer exists (e.g. after deleting), step back
  useEffect(() => {
    if (hasLoaded && page > totalPages) setPage(totalPages);
  }, [hasLoaded, page, totalPages]);

  // Escape: cancel inline confirmations first, then close
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;

      if (confirmClear || confirmingId !== null) {
        setConfirmClear(false);
        setConfirmingId(null);
        return;
      }

      onClose?.();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, confirmClear, confirmingId]);

  // Lock background scroll while the modal is visible
  useEffect(() => {
    if (!mounted) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  /* ----------------------------- Handlers ---------------------------- */
  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setConfirmingId(null);
    setPage(nextPage);
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeFilter = (value) => {
    if (value === filter) return;
    setConfirmingId(null);
    setFilter(value);
    setPage(1);
  };

  const changePageSize = (event) => {
    setConfirmingId(null);
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const deleteScan = async (scanId) => {
    setConfirmingId(null);
    setDeletingId(scanId);
    setActionError('');

    try {
      await api.delete(`${BASE_ENDPOINT}/${scanId}`);

      // Play the collapse animation, then sync with the server
      setRemovingIds((current) => new Set(current).add(scanId));
      setTotal((current) => Math.max(0, current - 1));

      setTimeout(() => {
        setRemovingIds((current) => {
          const next = new Set(current);
          next.delete(scanId);
          return next;
        });
        setHistory((current) => current.filter((scan) => scan.id !== scanId));
        fetchRef.current?.({ silent: true });
      }, ROW_REMOVE_MS);
    } catch (err) {
      setActionError(
        err.response?.data?.detail ||
          'Unable to delete the scan history record.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearHistory = async () => {
    setClearing(true);
    setActionError('');

    try {
      await api.delete(BASE_ENDPOINT);

      setConfirmClear(false);
      setHistory([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
    } catch (err) {
      setActionError(
        err.response?.data?.detail || 'Unable to clear scan history.'
      );
    } finally {
      setClearing(false);
    }
  };

  /* ------------------------------ Render ----------------------------- */
  if (!mounted) return null;

  const showSkeleton = loading && !hasLoaded;
  const isRefreshing = showLoading && hasLoaded;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, rangeStart + history.length - 1);
  const filterIndex = Math.max(
    0,
    FILTERS.findIndex((item) => item.value === filter)
  );

  return (
    <div
      className={classNames(
        'sh-root fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm',
        closing ? 'sh-overlay-out' : 'sh-overlay-in'
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <style>{CSS}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-history-title"
        className={classNames(
          'relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50',
          closing ? 'sh-panel-out' : 'sh-panel-in'
        )}
      >
        {/* Top accent + loading bar */}
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-gradient-to-r from-transparent via-blue-500 to-transparent">
          {isRefreshing && (
            <div className="sh-progress h-full w-1/3 bg-blue-300" />
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2
                id="scan-history-title"
                className="text-base font-semibold text-white"
              >
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-all duration-200 hover:rotate-90 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-b border-slate-800 bg-slate-900/40">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {/* Filter with sliding indicator */}
            <div
              role="tablist"
              aria-label="Filter scans by type"
              className="relative grid w-full grid-cols-3 rounded-lg border border-slate-800 bg-slate-950 p-1 sm:w-60"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-md bg-blue-600 shadow-sm shadow-blue-600/30 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ transform: `translateX(${filterIndex * 100}%)` }}
              />

              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  onClick={() => changeFilter(item.value)}
                  className={classNames(
                    'relative z-10 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200',
                    filter === item.value
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-200'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-500">
                {total} {total === 1 ? 'record' : 'records'}
              </span>

              {total > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClear((current) => !current)}
                  disabled={clearing || loading}
                  className={classNames(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                    confirmClear
                      ? 'border-red-500/40 bg-red-500/15 text-red-300'
                      : 'border-red-500/20 bg-red-500/5 text-red-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </button>
              )}

              <button
                type="button"
                onClick={() => fetchHistory()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw
                  className={classNames(
                    'h-3.5 w-3.5',
                    showLoading && 'animate-spin text-blue-400'
                  )}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* Clear-all confirmation (slides open) */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: confirmClear ? '1fr' : '0fr' }}
            aria-hidden={!confirmClear}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-3 border-t border-red-500/15 bg-red-500/5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs text-red-200/90">
                    This permanently deletes your entire scan history, including
                    records hidden by the current filter.
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    tabIndex={confirmClear ? 0 : -1}
                    onClick={() => setConfirmClear(false)}
                    disabled={clearing}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    tabIndex={confirmClear ? 0 : -1}
                    onClick={clearHistory}
                    disabled={clearing}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {clearing ? (
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {clearing ? 'Clearing...' : 'Yes, clear everything'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div
            role="alert"
            className="sh-pop flex items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-5 py-2.5 sm:px-6"
          >
            <p className="text-xs text-red-300">{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError('')}
              aria-label="Dismiss error"
              className="text-red-300/70 transition hover:text-red-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* History content */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {showSkeleton ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonRow key={index} index={index} />
              ))}
            </div>
          ) : error && history.length === 0 ? (
            <div className="sh-pop flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <ShieldX className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-medium text-red-300">
                Unable to load history
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">{error}</p>

              <button
                type="button"
                onClick={() => fetchHistory()}
                className="mt-4 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                Try Again
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="sh-pop flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-600">
                <Search className="h-5 w-5" />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-400">
                No scan records found
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-600">
                {filter === 'all'
                  ? 'Run a URL or email analysis to create your first history record.'
                  : 'There are no records matching the selected filter.'}
              </p>
            </div>
          ) : (
            <ul
              key={`${page}-${pageSize}-${filter}`}
              className={classNames(
                'transition-opacity duration-200',
                isRefreshing && 'pointer-events-none opacity-50'
              )}
            >
              {history.map((scan, index) => {
                const target = parseTarget(scan.content);
                const verdict = getVerdictStyle(scan.result);
                const removing = removingIds.has(scan.id);
                const confirming = confirmingId === scan.id;
                const deleting = deletingId === scan.id;

                const createdAt = new Date(scan.created_at);
                const formattedDate = createdAt.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const formattedTime = createdAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <li
                    key={scan.id}
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: removing ? '0fr' : '1fr',
                      opacity: removing ? 0 : 1,
                      transform: removing ? 'translateX(28px)' : 'none',
                    }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className="sh-row-in pb-2"
                        style={{
                          animationDelay: `${Math.min(index, 10) * 40}ms`,
                        }}
                      >
                        <div className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-4 pl-5 transition-colors duration-200 hover:border-slate-700 hover:bg-slate-900">
                          {/* Verdict accent bar */}
                          <span
                            aria-hidden="true"
                            className={classNames(
                              'absolute inset-y-3 left-0 w-0.5 rounded-full transition-all duration-300 group-hover:inset-y-2',
                              verdict.accent
                            )}
                          />

                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            {/* Target */}
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={classNames(
                                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800 transition-transform duration-200 group-hover:scale-105',
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

                            {/* Result + actions */}
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

                              <div className="text-left lg:min-w-28 lg:text-right">
                                <p className="text-[11px] text-slate-400">
                                  {formattedDate}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-600">
                                  {formattedTime}
                                </p>
                              </div>

                              {/* Inline delete confirmation */}
                              <div className="flex h-8 items-center justify-end lg:w-[88px]">
                                {confirming ? (
                                  <div className="sh-pop flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => deleteScan(scan.id)}
                                      aria-label={`Confirm delete scan ${scan.id}`}
                                      title="Confirm delete"
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-500"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingId(null)}
                                      aria-label="Cancel delete"
                                      title="Cancel"
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingId(scan.id)}
                                    disabled={deleting || clearing}
                                    aria-label={`Delete scan ${scan.id}`}
                                    title="Delete this scan"
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deleting ? (
                                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-900/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <p className="text-xs tabular-nums text-slate-500">
                Showing{' '}
                <span className="text-slate-300">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                of <span className="text-slate-300">{total}</span>
              </p>

              <label className="flex items-center gap-2 text-xs text-slate-500">
                Rows
                <select
                  value={pageSize}
                  onChange={changePageSize}
                  disabled={loading}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none transition focus:border-blue-500 disabled:opacity-50"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                disabled={loading}
                onChange={goToPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}