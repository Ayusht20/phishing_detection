'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [userName, setUserName] = useState('');
  const [isChecking, setIsChecking] = useState(true); // 1. Start in loading mode
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');

    // 2. Strict check: If no token, redirect immediately and stop
    if (!token) {
      router.replace('/login');
    } else {
      setUserName(name || 'User');
      setIsChecking(false); // 3. Only reveal the dashboard if token exists
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.replace('/login');
  };

  // 4. If checking or no token, block the dashboard completely
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Verifying session...
      </div>
    );
  }

  // 5. This only displays if an auth token exists in localStorage
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-white text-base tracking-wide">
            PhishGuard <span className="text-xs text-slate-400 font-normal">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{userName}</span>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white">Welcome back, {userName}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Scanner components and past detection tables will be injected into this container.
          </p>
        </div>

        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
          Scanner & Analysis components mount here
        </div>
      </main>
    </div>
  );
}