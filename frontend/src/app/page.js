'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI Phishing Detection
          </h1>
          <p className="text-sm text-slate-400">
            Real-time heuristic threat detection and security validation.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/login"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition text-center"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-sm transition text-center"
          >
            Create Account
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-slate-300 pt-2 underline underline-offset-4"
          >
            Go to Dashboard &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}