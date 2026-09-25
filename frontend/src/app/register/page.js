'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
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
          Give your team a second opinion on every inbox threat.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
          Create an account to start scanning links and emails, and keep a
          shared record of what your team has already caught.
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

function passwordStrength(password) {
  if (!password) return { label: '', width: '0%', color: 'bg-slate-800' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: 'Weak', width: '25%', color: 'bg-red-500' };
  if (score === 2) return { label: 'Fair', width: '50%', color: 'bg-amber-500' };
  if (score === 3) return { label: 'Good', width: '75%', color: 'bg-blue-500' };
  return { label: 'Strong', width: '100%', color: 'bg-emerald-500' };
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const strength = passwordStrength(password);
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(ENDPOINTS.AUTH.REGISTER, {
        name,
        email,
        password,
      });

      const { access_token, name: returnedName, role } = res.data || {};

      if (access_token) {
        localStorage.setItem('token', access_token);
        localStorage.setItem('userName', returnedName || name || '');
        if (role) {
          localStorage.setItem('userRole', role);
        }
        router.push(role === 'admin' ? '/admin/dashboard' : '/dashboard');
        return;
      }

      router.push('/login?registered=1');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create your account.');
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
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-sm text-slate-400">
              Start scanning links and emails in minutes
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Reyes"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

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
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
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
              {password.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">{strength.label}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-slate-950 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-slate-500 transition focus:outline-none ${
                    passwordsMismatch
                      ? 'border-red-800 focus:border-red-500'
                      : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
              {passwordsMismatch && (
                <p className="text-[11px] text-red-400">Passwords don&apos;t match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800/60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}