'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, Building, ArrowRight, Shield } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { PayPalLogo } from '@/components/PayPalLogo';

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('BUYER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(email, password, role, fullName);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
            Create PromisePay Account
          </h2>
          <p className="text-xs text-slate-500">
            Decentralized multi-tenant account with role-scoped permissions
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
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0070BA] focus:outline-none focus:ring-1 focus:ring-[#0070BA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Role Designation
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { r: 'BUYER' as UserRole, title: 'Buyer / Client', sub: 'Commission work & capture payment' },
                { r: 'SELLER' as UserRole, title: 'Seller / Merchant', sub: 'Deliver milestones & get paid' },
              ].map((opt) => (
                <button
                  key={opt.r}
                  type="button"
                  onClick={() => setRole(opt.r)}
                  className={`p-3 rounded-lg border text-left transition ${
                    role === opt.r
                      ? 'border-[#0070BA] bg-[#EBF3FC]/60 ring-1 ring-[#0070BA]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">{opt.title}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070BA] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#003087] disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Tenant Account...' : 'Complete Sign Up'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-[#0070BA] hover:underline">
            Sign in to existing account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

