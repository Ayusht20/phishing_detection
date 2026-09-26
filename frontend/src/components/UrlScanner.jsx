'use client';

import { useState } from 'react';
import axios from 'axios';

export default function UrlScanner() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in first to scan URLs.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:8000/api/scan/url',
        { url: url.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired or unauthorized. Please re-login.');
      } else {
        setError(err.response?.data?.detail || 'Failed to scan the URL. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">URL Phishing & Threat Scanner</h2>
        <p className="text-xs text-slate-400">
          Analyze suspicious web links against Google Safe Browsing and VirusTotal engines.
        </p>
      </div>

      <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example-suspicious-link.com"
          className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 font-semibold text-sm text-white rounded-xl transition flex items-center justify-center min-w-[120px]"
        >
          {loading ? 'Scanning...' : 'Scan URL'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Scan Results Card */}
      {result && (
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Scan Verdict
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                result.result === 'phishing'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : result.result === 'suspicious'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {result.result}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/60">
            <div>
              <p className="text-slate-500">Risk Assessment</p>
              <p className="font-semibold text-slate-200 capitalize mt-0.5">
                {result.risk_level || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Target Link</p>
              <p className="font-mono text-slate-300 truncate mt-0.5" title={result.content}>
                {result.content}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}