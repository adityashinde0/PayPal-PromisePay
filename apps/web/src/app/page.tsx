'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PromiseCategory, PromiseStatus, PromiseSummaryResponse } from '@/types/promise';
import { fetchPromises } from '@/lib/api';

const PromiseLedgerGrid = dynamic(
  () => import('@/components/PromiseLedgerGrid').then((mod) => mod.PromiseLedgerGrid),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm font-medium text-slate-500">Loading Enterprise Ledger...</p>
      </div>
    ),
  }
);

export default function Home() {
  const [promises, setPromises] = useState<PromiseSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<PromiseCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<PromiseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'ag-grid' | 'table'>('ag-grid');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchPromises({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: search || undefined,
      });
      setPromises(res.items);
      setTotal(res.total);
    } catch {
      // Fallback for initial dev boot
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter]);

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
        setResetSuccess('Judge demo scenarios successfully reset!');
        setTimeout(() => setResetSuccess(null), 4000);
        await loadData();
      }
    } catch {
      // Ignore
    } finally {
      setResetting(false);
    }
  };

  // Metrics calculation
  const capturedCount = promises.filter((p) => p.paymentState === 'CAPTURED').length;
  const verifiedCount = promises.filter((p) => p.outcome === 'COMPLETE').length;
  const reviewCount = promises.filter((p) => p.status === 'REVIEW_REQUIRED' || p.outcome === 'REVIEW_REQUIRED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Promise Ledger</h2>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-[#0070BA]">
              AG Grid Powered
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Immutable proof-of-outcome ledger linking agreements, PayPal Sandbox payments, and AI verification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Reset to 3 judge-ready canonical scenarios"
          >
            {resetting ? 'Resetting...' : '🔄 Reset Demo Scenarios'}
          </button>
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-lg bg-[#0070BA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003087] transition-colors"
          >
            + Create Promise
          </Link>
        </div>
      </div>

      {resetSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          ✓ {resetSuccess}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Promises</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">PayPal Captured</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{capturedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">AI Verified</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{verifiedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Review Gated</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{reviewCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="digital_project">Digital Project</option>
            <option value="professional_document">Professional Document</option>
            <option value="delivery">Delivery / Physical</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              onClick={() => setViewMode('ag-grid')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'ag-grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AG Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard Table
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Quick search ID, title, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 sm:w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Ledger Display */}
      {viewMode === 'ag-grid' ? (
        <PromiseLedgerGrid rowData={promises} quickFilterText={search} loading={loading} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Promise ID</th>
                  <th scope="col" className="px-6 py-3.5">Category</th>
                  <th scope="col" className="px-6 py-3.5">Title</th>
                  <th scope="col" className="px-6 py-3.5">Amount</th>
                  <th scope="col" className="px-6 py-3.5">Lifecycle Status</th>
                  <th scope="col" className="px-6 py-3.5">Payment State</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-500">
                      Loading records from Promise API...
                    </td>
                  </tr>
                ) : promises.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-500">
                      No promises found matching filters.
                    </td>
                  </tr>
                ) : (
                  promises.map((p) => (
                    <tr key={p.promiseId} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        {p.promiseId}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs capitalize text-slate-600">
                        {p.category.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-xs truncate">
                        {p.title}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-[#003087]">
                        ${p.amount.value} {p.amount.currencyCode}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            p.status === 'COMPLETE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : p.status === 'REVIEW_REQUIRED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : p.status === 'PAID'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-600">
                        {p.paymentState}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          href={`/promises/${p.promiseId}`}
                          className="text-xs font-semibold text-[#0070BA] hover:text-[#003087]"
                        >
                          View Graph &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            Showing {promises.length} of {total} promises
          </div>
        </div>
      )}
    </div>
  );
}
