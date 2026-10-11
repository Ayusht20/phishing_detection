'use client';

import { useState } from 'react';
import { Download, RotateCw } from 'lucide-react';
import api from '@/services/api';
import { ENDPOINTS } from '@/constants/apiEndpoints';

const BASE_ENDPOINT = ENDPOINTS?.SCAN_HISTORY || '/api/scan/history';

// Error responses arrive as a Blob when responseType is "blob",
// so read the JSON out of it to get the server's message.
async function readError(err, fallback) {
  const data = err?.response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.detail || fallback;
    } catch {
      return fallback;
    }
  }

  return data?.detail || fallback;
}

// The endpoint needs the auth token, so a plain <a href> would not work.
// Fetch the PDF through the api client and save it from a blob URL.
export async function downloadScanReport(scanId) {
  const response = await api.get(`${BASE_ENDPOINT}/${scanId}/report`, {
    responseType: 'blob',
  });

  const url = URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' })
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = `phishguard-report-${scanId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DownloadReportButton({
  scanId,
  variant = 'icon', // 'icon' (history rows) | 'button' (report card)
  disabled = false,
  onError,
  onSuccess,
  className = '',
}) {
  const [busy, setBusy] = useState(false);
  const unavailable = !scanId;

  const handleClick = async () => {
    if (unavailable || busy) return;

    setBusy(true);

    try {
      await downloadScanReport(scanId);
      onSuccess?.();
    } catch (err) {
      onError?.(await readError(err, 'Unable to download the report.'));
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy || unavailable}
        title={
          unavailable
            ? 'The report is available once the scan has been saved'
            : 'Download this report as a PDF'
        }
        className={`flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {busy ? (
          <RotateCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {busy ? 'Preparing PDF...' : 'Download report'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy || unavailable}
      aria-label={`Download report for scan ${scanId}`}
      title="Download PDF report"
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-500 transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {busy ? (
        <RotateCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default DownloadReportButton;