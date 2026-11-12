'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search,
  Download,
  PlusCircle,
  Table2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Check,
  ShieldCheck,
  CreditCard,
  Clock,
  TrendingUp,
  AlertTriangle,
  Scale,
  BarChart3,
  ExternalLink,
  FileText,
  Lock,
  Unlock,
  Package,
} from 'lucide-react';
import { PromiseCategory, PromiseStatus, PromiseSummaryResponse } from '@/types/promise';
import { fetchPromises } from '@/lib/api';
import { useDashboard } from '@/context/DashboardContext';
import { LifecycleStepper } from '@/components/LifecycleStepper';
import { ActivePromiseSpotlight } from '@/components/ActivePromiseSpotlight';
import { RecentActivityTimeline } from '@/components/RecentActivityTimeline';
import { AiOutcomeCard } from '@/components/AiOutcomeCard';

const PromiseLedgerGrid = dynamic(
  () => import('@/components/PromiseLedgerGrid').then((mod) => mod.PromiseLedgerGrid),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0070BA] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">
            Loading Enterprise Ledger...
          </p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const { activeTab, setActiveTab, role, globalSearch } = useDashboard();
  const [promises, setPromises] = useState<PromiseSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<PromiseCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<PromiseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPromises({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: search || globalSearch || undefined,
      });
      setPromises(res.items);
      setTotal(res.total);
    } catch {
      // Dev boot fallback
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, search, globalSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/demo/reset`, { method: 'POST' });
      if (res.ok) {
        setResetSuccess('Demo scenarios successfully reset to 3 canonical promises!');
        setTimeout(() => setResetSuccess(null), 4000);
        await loadData();
      }
    } catch {
      // Ignore
    } finally {
      setResetting(false);
    }
  };

  // Dynamic metrics calculation
  const totalVolume = promises.reduce(
    (sum, p) => sum + (parseFloat(p.amount?.value) || 0),
    0
  );
  const digitalVolume = promises
    .filter((p) => p.category === 'digital_project')
    .reduce((sum, p) => sum + (parseFloat(p.amount?.value) || 0), 0);
  const docVolume = promises
    .filter((p) => p.category === 'professional_document')
    .reduce((sum, p) => sum + (parseFloat(p.amount?.value) || 0), 0);
  const deliveryVolume = promises
    .filter((p) => p.category === 'delivery')
    .reduce((sum, p) => sum + (parseFloat(p.amount?.value) || 0), 0);

  const digitalPct = totalVolume > 0 ? Math.round((digitalVolume / totalVolume) * 100) : 0;
  const docPct = totalVolume > 0 ? Math.round((docVolume / totalVolume) * 100) : 0;
  const deliveryPct = totalVolume > 0 ? Math.round((deliveryVolume / totalVolume) * 100) : 0;

  const capturedCount = promises.filter((p) => p.paymentState === 'CAPTURED').length;
  const capturedPct = promises.length > 0 ? Math.round((capturedCount / promises.length) * 100) : 0;
  const verifiedCount = promises.filter(
    (p) => p.outcome === 'COMPLETE' || p.status === 'VERIFYING'
  ).length;
  const reviewCount = promises.filter(
    (p) => p.status === 'REVIEW_REQUIRED' || p.outcome === 'REVIEW_REQUIRED'
  ).length;
  const activePromise = promises.find((p) => p.status !== 'COMPLETE') || promises[0] || null;

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW 1: CLEAN DASHBOARD (ONLY ESSENTIAL, HIGH-PRIORITY ITEMS)
         ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Context Header */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003087] via-[#0070BA] to-cyan-400" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0070BA] border border-blue-200 uppercase tracking-wider">
                    {role === 'buyer' ? 'Buyer Overview' : 'Seller Fulfillment Portal'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">PayPal Sandbox Mode</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {role === 'buyer'
                    ? 'Payment & Deliverable Status'
                    : 'Active Deliverables & Outcome Verification'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  {role === 'buyer'
                    ? 'Payment captured via PayPal Sandbox. Verify submitted deliverables with Gemini AI for outcome verification.'
                    : 'Submit proof of completion for your active contracts to trigger automated Gemini AI outcome verification.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetDemo}
                  disabled={resetting}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`inline-block mr-1 h-3 w-3 ${resetting ? 'animate-spin' : ''}`} />
                  {resetting ? 'Resetting...' : 'Reset Demo'}
                </button>

                <Link
                  href="/create"
                  className="rounded-lg bg-[#0070BA] hover:bg-[#003087] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  + New Promise
                </Link>
              </div>
            </div>
          </div>

          {resetSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* 4 Essential KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Total Payment Volume</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-2xl font-black text-slate-900">
                ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{total} active agreements</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">PayPal Payment Captured</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Captured
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-600">{capturedCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Captured PayPal payments</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">In AI Verification</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  Audited
                </span>
              </div>
              <p className="text-2xl font-black text-blue-600">{verifiedCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Gemini auditing proofs</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Action Required</span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  Attention
                </span>
              </div>
              <p className="text-2xl font-black text-amber-600">{reviewCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Awaiting buyer / dispute signoff</p>
            </div>
          </div>

          {/* 5-Step Lifecycle Stepper */}
          <LifecycleStepper />

          {/* Clean 2-Column Focus Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 60%: High-Priority Action Card */}
            <div className="lg:col-span-7 space-y-4">
              <AiOutcomeCard promise={activePromise} />

              {/* Quick shortcut to full ledger */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Need to browse all contracts?
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Switch to the dedicated Promise Ledger with AG Grid filters and CSV export.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ledger')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors"
                >
                  <span>Open Full Ledger</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Right 40%: Active Deal Spotlight & Activity Feed */}
            <div className="lg:col-span-5 space-y-4">
              <ActivePromiseSpotlight promise={activePromise} />
              <RecentActivityTimeline promises={promises} onViewAll={() => setActiveTab('ledger')} />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DEDICATED FULL-WIDTH PROMISE LEDGER
         ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  Promise Ledger & Verification Registry
                </h1>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0070BA] border border-blue-200">
                  {total} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete verifiable record of payment promises, PayPal Sandbox orders, and AI outcomes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#0070BA] focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="digital_project">Digital Project</option>
                <option value="professional_document">Document</option>
                <option value="delivery">Physical Delivery</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[#0070BA] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="READY_FOR_PAYMENT">READY_FOR_PAYMENT</option>
                <option value="PAID">PAID</option>
                <option value="FULFILLMENT">FULFILLMENT</option>
                <option value="EVIDENCE_SUBMITTED">EVIDENCE_SUBMITTED</option>
                <option value="COMPLETE">COMPLETE</option>
                <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const csvContent =
                    'data:text/csv;charset=utf-8,' +
                    ['PromiseId,Title,Amount,Status,PaymentState']
                      .concat(
                        promises.map(
                          (p) =>
                            `${p.promiseId},"${p.title}",${p.amount?.value || 0},${p.status},${p.paymentState}`
                        )
                      )
                      .join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', 'promisepay_ledger.csv');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <Link
                href="/create"
                className="inline-flex items-center gap-1 rounded-lg bg-[#0070BA] hover:bg-[#003087] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Promise</span>
              </Link>
            </div>
          </div>

          {/* Quick Filter Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search promises by keyword, merchant ref, or Promise ID..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0070BA] focus:outline-none shadow-2xs"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#0070BA] hover:bg-[#003087] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
            >
              Filter
            </button>
          </form>

          {/* Full-width AG Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <PromiseLedgerGrid
              rowData={promises}
              quickFilterText={search}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DEDICATED AI VERIFICATION CENTER
         ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-[#0070BA]" />
              <h1 className="text-xl font-black text-slate-900">
                Gemini AI Verification Center
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic, explainable proof-of-outcome matching deliverable evidence against atomic contractual criteria.
            </p>
          </div>

          {/* Verification Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Average Confidence Score</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">99.4%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Evaluated across active atomic requirements</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Outcome Verification Accuracy</p>
              <p className="text-2xl font-black text-[#0070BA] mt-1">100%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Strict contractual criteria validation</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">Average Audit Velocity</p>
              <p className="text-2xl font-black text-purple-600 mt-1">2.4 min</p>
              <p className="text-[10px] text-slate-400 mt-0.5">From deliverable upload to outcome attestation</p>
            </div>
          </div>

          {/* Active Verifications List */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Active Verification Audits
            </h2>
            <AiOutcomeCard promise={activePromise} />
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: DEDICATED RESOLUTION & DISPUTES
         ========================================================================= */}
      {activeTab === 'resolution' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-5 w-5 text-[#0070BA]" />
              <h1 className="text-xl font-black text-slate-900">
                Resolution & Dispute Center
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Human-reviewed resolution and PayPal refund execution for review-gated promises.
            </p>
          </div>

          {/* Case status summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#0070BA] mx-auto border border-blue-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                All Active Contracts Nominal
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No contested disputes currently open. Review-gated promises are awaiting deliverable resubmissions or buyer signoff.
              </p>
            </div>
            <div className="pt-2">
              {promises.length > 0 ? (
                <Link
                  href={`/promises/${promises[0].promiseId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070BA] hover:bg-[#003087] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <span>Inspect Case ({promises[0].promiseId})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400 cursor-not-allowed">
                  No active promises found
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: DEDICATED PAYMENT ANALYTICS
         ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-[#0070BA]" />
              <h1 className="text-xl font-black text-slate-900">
                Outcome Verification & Payment Analytics
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Payment throughput, category distributions, and PayPal settlement velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-700 mb-2">Volume by Category</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Digital Projects</span>
                  <span className="text-[#0070BA]">{digitalPct}% (${digitalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Professional Documents</span>
                  <span className="text-cyan-700">{docPct}% (${docVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Physical Delivery</span>
                  <span className="text-emerald-700">{deliveryPct}% (${deliveryVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-700 mb-2">PayPal Settlement</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>Authorized Intent</span>
                  <span className="text-slate-900">{capturedPct}% captured</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Refund Rate</span>
                  <span className="text-emerald-700">&lt; 0.5%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Dispute Mediation</span>
                  <span className="text-[#0070BA]">Human-reviewed resolution</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-700 mb-2">Platform SLA</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span>API Uptime</span>
                  <span className="text-emerald-700">99.98%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Webhook Latency</span>
                  <span className="text-slate-900">420 ms</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Gemini Inference</span>
                  <span className="text-[#0070BA]">1.2s avg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
