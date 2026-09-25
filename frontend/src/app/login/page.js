'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Gauge,
  History,
} from 'lucide-react';
import api from '../../services/api';
import { ENDPOINTS } from '../../constants/apiEndpoints';

const VALUE_PROPS = [
  {
    title: 'URL & email scanning',
    description: 'Check links and messages against live threat intel in one place.',
    Icon: Link2,
  },
  {
    title: 'Instant verdicts',
    description: 'A clear safe, suspicious, or phishing call in under a second.',
    Icon: Gauge,
  },
  {
    title: 'Full scan history',
    description: 'Every scan your team runs stays logged and searchable.',
    Icon: History,
  },
];

function RadarMark({ className = 'h-9 w-9' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500/20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/30">
        <ShieldCheck className="h-1/2 w-1/2 text-blue-400" />
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(100 116 139) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[32rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[110px]" />

      <div className="relative px-12 pt-12">
        <div className="flex items-center gap-2.5">
          <RadarMark className="h-9 w-9" />
          <span className="text-sm font-bold tracking-tight text-slate-100">
            PhishGuard
          </span>
        </div>
      </div>

      <div className="relative px-12">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-50">
          Stay ahead of every phishing attempt.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          Sign in to run scans, review verdicts, and keep a full record of every
          threat your team has already caught.
        </p>

        <ul className="mt-8 space-y-5">
          {VALUE_PROPS.map(({ title, description, Icon }) => (
            <li key={title} className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative px-12 pb-12">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} PhishGuard. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [justRegistered, setJustRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setJustRegistered(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post(ENDPOINTS.AUTH.LOGIN, { email, password });

      const { access_token, name, role } = res.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('userName', name || '');
      if (role) {
        localStorage.setItem('userRole', role);
      }

      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <BrandPanel />

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="mb-2 flex items-center gap-2.5 lg:hidden">
            <RadarMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-tight text-slate-100">
              PhishGuard
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">Sign in</h2>
            <p className="text-sm text-slate-400">Access your security dashboard</p>
          </div>

          {justRegistered && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Account created. Sign in to get started.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800/60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Authenticating…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}