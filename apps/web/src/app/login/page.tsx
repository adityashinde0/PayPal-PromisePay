'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { PayPalLogo } from '@/components/PayPalLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const demoEmail = `${role.toLowerCase()}@promisepay.example`;
      await login(demoEmail, 'password123', role);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <PayPalLogo height={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to PromisePay
          </h2>
          <p className="text-xs text-slate-500">
            Multi-Tenant Zero-Trust Identity with Role-Based Access Control
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice.buyer@example.com"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0070BA] focus:outline-none focus:ring-1 focus:ring-[#0070BA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0070BA] focus:outline-none focus:ring-1 focus:ring-[#0070BA]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070BA] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003087] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* 1-Click Role Switcher / Demo Login */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase text-[10px] tracking-wider text-slate-400">
              1-Click Demo Personas
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              JWKS Ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'BUYER' as UserRole, label: 'Buyer', desc: 'Confirm terms & fund escrow' },
              { role: 'SELLER' as UserRole, label: 'Seller', desc: 'Submit delivery evidence' },
              { role: 'REVIEWER' as UserRole, label: 'Arbitrator', desc: 'Adjudicate dispute cases' },
              { role: 'ADMIN' as UserRole, label: 'Admin', desc: 'Full platform governance' },
            ].map((persona) => (
              <button
                key={persona.role}
                type="button"
                onClick={() => handleQuickLogin(persona.role)}
                disabled={loading}
                className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition text-left"
              >
                <span className="text-xs font-bold text-slate-800">{persona.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{persona.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-[#0070BA] hover:underline">
            Register new tenant organization &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

