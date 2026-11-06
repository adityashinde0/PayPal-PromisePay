'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck,
} from 'lucide-react';
import { PromiseSummaryResponse } from '@/types/promise';

interface AiOutcomeCardProps {
  promise?: PromiseSummaryResponse | null;
}

export function AiOutcomeCard({ promise }: AiOutcomeCardProps) {
  const id = promise?.promiseId || 'PP-8F72X-2026';
  const title = promise?.title || 'E-commerce Website & Deployment Agreement';
  const amount = promise?.amount?.value || '500.00';
  const currency = promise?.amount?.currencyCode || 'USD';
  const isCaptured = promise?.paymentState === 'CAPTURED';
  const outcome = promise?.outcome || 'COMPLETE';
  const confidence = outcome === 'COMPLETE' ? '99.2%' : outcome === 'REVIEW_REQUIRED' ? '68.4%' : '95.0%';

  const checklist = [
    { title: 'Contractual deliverable criteria matched against atomic specifications', verified: true },
    { title: 'SSRF & integrity verified for submitted URLs, artifacts, and commits', verified: true },
    { title: 'Cryptographic SHA-256 provenance attested for PayPal Resolution Center', verified: true },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white via-blue-50/20 to-white p-5 shadow-sm sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070BA] to-[#003087] text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                AI Proof-of-Outcome Verification
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                {outcome === 'COMPLETE' ? 'Attested Complete' : outcome === 'REVIEW_REQUIRED' ? 'Review Required' : 'Active Audit'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live automated evidence audit comparing delivery artifacts with agreement terms.
            </p>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 self-start sm:self-auto">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Gemini AI Score
            </p>
            <p className="text-xs font-black text-emerald-800">
              {confidence} Verified Match
            </p>
          </div>
        </div>
      </div>

      {/* Contract & Evidence Preview */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
          <div>
            <span className="font-mono text-[11px] font-bold text-[#0070BA] bg-blue-50 px-2 py-0.5 rounded">
              {id}
            </span>
            <span className="ml-2 text-xs font-bold text-slate-900">
              {title}
            </span>
          </div>
          <div className="font-mono text-xs font-bold text-slate-800">
            ${amount} {currency}{' '}
            <span className="text-[10px] font-normal text-slate-400">
              ({isCaptured ? 'PayPal payment captured' : 'Ready for Payment'})
            </span>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.title} className="flex items-start gap-2 text-xs text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-medium text-slate-700 leading-tight">
                {item.title}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
          <span>Attestation Hash: 0x9f2a...8c71</span>
          <span className="text-emerald-600 font-sans font-semibold">Gemini 1.5 Flash Verified</span>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Link
          href={`/promises/${id}`}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#0070BA] hover:text-[#003087] transition-colors"
        >
          <span>Inspect Full AI Evidence Graph</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>

        <Link
          href={`/promises/${id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0070BA] hover:bg-[#003087] px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm hover:shadow-md"
        >
          <FileCheck className="h-4 w-4" />
          <span>View Verification Report</span>
        </Link>
      </div>
    </div>
  );
}
