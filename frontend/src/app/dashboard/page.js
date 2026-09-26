'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Dashboard() {
  const [userName, setUserName] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  
  // Scanner States
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');

    if (!token) {
      router.replace('/login');
    } else {
      setUserName(name || 'User');
      setIsChecking(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    router.replace('/login');
  };

  const handleScan = async (e) => {
    e.preventDefault();
    setScanError('');
    setScanResult(null);

    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
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
      setScanResult(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setScanError('Session expired. Please log in again.');
        setTimeout(() => router.replace('/login'), 1500);
      } else {
        setScanError(err.response?.data?.detail || 'Failed to scan the URL. Please verify the backend service.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Verifying session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-white text-base tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
            PhishGuard <span className="text-xs text-slate-400 font-normal">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300 font-medium">{userName}</span>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Welcome back, {userName}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze suspicious links against threat intelligence networks in real time.
          </p>
        </div>

        {/* URL Scanner Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-semibold text-white">Live URL Threat Scanner</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter any web address to check for phishing and malicious signatures.
            </p>
          </div>

          <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suspicious-domain-verify.com"
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 font-semibold text-sm text-white rounded-xl transition flex items-center justify-center min-w-[130px]"
            >
              {loading ? 'Scanning...' : 'Scan URL'}
            </button>
          </form>

          {/* Error Notice */}
          {scanError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-medium">
              {scanError}
            </div>
          )}

          {/* Results Box */}
          {scanResult && (
            <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Analysis Outcome
                </span>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    scanResult.result === 'phishing'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : scanResult.result === 'suspicious'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {scanResult.result}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div>
                  <p className="text-slate-500">Risk Assessment</p>
                  <p className="font-semibold text-slate-200 capitalize mt-0.5">
                    {scanResult.risk_level || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Target Address</p>
                  <p className="font-mono text-slate-300 truncate mt-0.5" title={scanResult.content}>
                    {scanResult.content}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}