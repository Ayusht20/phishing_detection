// Shared helpers for scan records.
// Suggested location: lib/scanUtils.js  (imported as '@/lib/scanUtils')
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

export function parseTarget(content) {
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

export function getVerdictStyle(result) {
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

export function getRiskStyle(risk) {
  const value = (risk || '').toLowerCase();

  if (value === 'high' || value === 'critical') return 'text-red-400';
  if (value === 'medium') return 'text-amber-400';
  if (value === 'low') return 'text-emerald-400';
  return 'text-slate-400';
}