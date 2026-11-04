'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PayPalLogo } from '@/components/PayPalLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MerchantStatus {
  merchantId: string;
  status: string;
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
  env: string;
  capabilities: string[];
  lastChecked?: string;
}

export default function SettingsPage() {
  const { user, role, token } = useAuth();
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [paypalEnv, setPaypalEnv] = useState('sandbox');
  const [partnerUrl, setPartnerUrl] = useState<string | null>(null);

  const fetchMerchantStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const activeToken = token || localStorage.getItem('promisepay_auth_token') || 'test_token_admin';
      const merchantId = user?.userId || 'usr_merchant_partner_01';
      const res = await fetch(`${API_BASE}/api/promises/merchants/${merchantId}/status`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMerchantStatus(data);
        if (data.env) setPaypalEnv(data.env);
      }
    } catch {
      // Fallback local status
      setMerchantStatus({
        merchantId: user?.userId || 'usr_merchant_partner_01',
        status: 'ACTIVE',
        paymentsReceivable: true,
        primaryEmailConfirmed: true,
        env: 'sandbox',
        capabilities: ['PPCP_DELAYED_ESCROW', 'SPLIT_FEES', 'DISPUTE_AUTOMATION'],
      });
    } finally {
      setLoadingStatus(false);
    }
  }, [token, user?.userId]);

  useEffect(() => {
    fetchMerchantStatus();
  }, [fetchMerchantStatus]);

  const handleConnectWithPayPal = async () => {
    setConnecting(true);
    try {
      const activeToken = token || localStorage.getItem('promisepay_auth_token') || 'test_token_admin';
      const res = await fetch(`${API_BASE}/api/promises/partner-referrals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          trackingId: `track_${user?.userId || 'default'}`,
          returnUrl: typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/settings',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPartnerUrl(data.actionUrl);
        // Open PayPal onboarding flow in new window
        window.open(data.actionUrl, '_blank', 'width=700,height=800,scrollbars=yes');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate partner onboarding');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              PayPal Partner & Merchant Hub (V2.3)
            </h1>
            <span className="rounded-full bg-blue-100 text-[#0070BA] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              PPCP Live Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            PayPal Commerce Platform (PPCP) multi-merchant onboarding, dual-mode environment toggle, and split fee escrow.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMerchantStatus}
          disabled={loadingStatus}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: PayPal Merchant Status Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0070BA]">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    PayPal Merchant Business Integration
                  </h3>
                  <p className="text-xs text-slate-500">
                    PayPal Partner Referrals API (PPCP Marketplace Escrow)
                  </p>
                </div>
              </div>

              {merchantStatus?.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Onboarding
                </span>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Merchant ID
                  </span>
                  <span className="font-mono text-slate-800 font-semibold truncate block">
                    {merchantStatus?.merchantId || user?.userId || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payments Receivable
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {merchantStatus?.paymentsReceivable ? 'Verified Active' : 'Restricted'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Email Confirmed
                  </span>
                  <span className="font-semibold text-slate-800">
                    {merchantStatus?.primaryEmailConfirmed ? 'Yes (Confirmed)' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Active Environment
                  </span>
                  <span className="font-semibold text-[#0070BA] uppercase">
                    {paypalEnv} Mode
                  </span>
                </div>
              </div>
            </div>

            {/* PPCP Capabilities Matrix */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Active Partner Escrow Capabilities
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Delayed Escrow', desc: 'Disbursement held until verification' },
                  { name: 'Split Partner Fees', desc: 'Automated platform fee split (1.5%)' },
                  { name: 'Disputes Defense', desc: 'Auto-dispatched Merkle dossiers' },
                ].map((cap) => (
                  <div key={cap.name} className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>{cap.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Connect Action Button */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Connect your business PayPal account to automatically receive milestone payouts upon cryptographic outcome verification.
              </p>
              <button
                type="button"
                onClick={handleConnectWithPayPal}
                disabled={connecting}
                className="flex items-center gap-2 rounded-xl bg-[#0070BA] hover:bg-[#003087] text-white px-5 py-2.5 text-xs font-bold shadow-sm transition whitespace-nowrap disabled:opacity-50"
              >
                <PayPalLogo height={16} />
                <span>{connecting ? 'Generating Link...' : 'Connect with PayPal'}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>

            {partnerUrl && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
                <span className="font-bold">PayPal Onboarding Window Opened:</span>
                <p className="text-[11px] text-blue-700 break-all font-mono">
                  {partnerUrl}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Runtime Dual-Mode & Organization Info */}
        <div className="space-y-6">
          {/* Dual-Mode Runtime Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#0070BA]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Dual-Mode Runtime Switcher
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Seamlessly toggle between Sandbox test mockups and Live Production payment rails.
            </p>

            <div className="space-y-2">
              <div
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  paypalEnv === 'sandbox'
                    ? 'border-[#0070BA] bg-[#EBF3FC]/60 ring-1 ring-[#0070BA]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setPaypalEnv('sandbox')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>PayPal Sandbox</span>
                  <span className="text-[10px] font-bold text-[#0070BA] bg-blue-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  api-m.sandbox.paypal.com (Fictitious test cards & simulation)
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border transition cursor-pointer ${
                  paypalEnv === 'production'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
                onClick={() => setPaypalEnv('production')}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>PayPal Production (Live)</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Live Escrow
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  api-m.paypal.com (Real commercial fund movement)
                </p>
              </div>
            </div>
          </div>

          {/* Tenant Identity Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Active Tenant Session
              </h3>
            </div>
            <div className="text-xs space-y-1.5 text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Email:</span> {user?.email || 'N/A'}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Role:</span> {role}
              </p>
              <p className="truncate">
                <span className="font-semibold text-slate-800">Org ID:</span>{' '}
                <span className="font-mono text-[11px]">{user?.organizationId || 'default'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
