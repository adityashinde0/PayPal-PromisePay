'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PromiseCategory, PromiseStatus, PromiseSummaryResponse } from '@/types/promise';
import { fetchPromises } from '@/lib/api';

export default function Home() {
  const [promises, setPromises] = useState<PromiseSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<PromiseCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<PromiseStatus | ''>('');
  const [search, setSearch] = useState('');

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
      // Fallback for initial offline or dev boot
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Promise Ledger</h2>
          <p className="mt-1 text-sm text-slate-500">
            Immutable proof-of-outcome ledger linking agreements, PayPal Sandbox payments, and AI verification.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center justify-center rounded-lg bg-[#0070BA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#003087] transition-colors"
        >
          + Create Promise
        </Link>
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
            <option value="COMPLETE">COMPLETE</option>
          </select>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by ID or title..."
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

      {/* Ledger Table */}
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
                          p.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.status === 'READY_FOR_PAYMENT'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
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
    </div>
  );
}
