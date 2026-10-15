'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ScanHistory from '@/components/ScanHistory';
import UrlScanner from '@/components/UrlScanner';
import EmailScanner from '@/components/EmailScanner';
import { classNames } from '@/components/scanner-common';
import {
  Link2,
  Mail,
  LogOut,
  Radar,
  ShieldCheck,
  History,
} from 'lucide-react';

function RadarMark({ className = 'h-9 w-9' }) {
  return (
    <div
      className={classNames(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/10 ring-1 ring-blue-500/30',
        className
      )}
    >
      <ShieldCheck className="h-1/2 w-1/2 text-blue-400" />
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('url');

  // History state
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');

    if (!token) {
      router.replace('/login');
    } else {
      setUserName(name || 'Security Analyst');
      setIsChecking(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.replace('/login');
  };

  const handleScanComplete = () => {
    setRefreshHistory((prev) => prev + 1);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Radar className="h-8 w-8 animate-pulse text-blue-400" />
          <p className="text-sm text-slate-500">Verifying active session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 font-sans text-slate-100">
      {/* Ambient background glow and grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 right-1/4 h-64 w-80 rounded-full bg-emerald-600/10 blur-3xl" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <RadarMark className="h-8 w-8" />
            <div className="flex items-baseline gap-2">
              <span className="bg-gradient-to-r from-blue-300 to-cyan-400 bg-clip-text text-sm font-bold tracking-tight text-transparent">
                PhishGuard
              </span>
              <span className="text-xs font-normal text-slate-500">Threat Console</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 py-1 pl-1 pr-3.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400">
                {userName.trim().charAt(0).toUpperCase() || 'S'}
              </span>
              <span className="text-sm font-medium text-slate-300">{userName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-500/40 hover:bg-red-950/60 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl space-y-6 p-6">
        {/* Scan History Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500/40 hover:bg-slate-800 hover:text-white"
          >
            <History className="h-4 w-4 text-blue-400" />
            View History
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 p-1">
          <button
            onClick={() => setActiveTab('url')}
            className={classNames(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all',
              activeTab === 'url'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Link2 className="h-4 w-4" />
            URL Scanner
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={classNames(
              'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all',
              activeTab === 'email'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Mail className="h-4 w-4" />
            EMAIL Scanner
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'url' && <UrlScanner onScanComplete={handleScanComplete} />}
        {activeTab === 'email' && <EmailScanner onScanComplete={handleScanComplete} />}
      </main>

      {/* Scan History Modal */}
      <ScanHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        refreshTrigger={refreshHistory}
      />
    </div>
  );
}