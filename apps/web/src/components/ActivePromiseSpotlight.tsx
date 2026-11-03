'use client';

import React from 'react';
import Link from 'next/link';
import { Laptop, FileText, Package, ArrowRight, Check, Sparkles, PlusCircle } from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';
import { PromiseSummaryResponse, PromiseStatus } from '@/types/promise';

interface ActivePromiseSpotlightProps {
  promise?: PromiseSummaryResponse | null;
  promiseId?: string;
  title?: string;
  amount?: string;
  orderId?: string;
  confidence?: number;
  currentStep?: number;
}

function getStepFromStatus(status?: PromiseStatus): number {
  switch (status) {
    case 'DRAFT':
    case 'READY_FOR_PAYMENT':
      return 0;
    case 'PAID':
      return 1;
    case 'FULFILLMENT':
    case 'EVIDENCE_SUBMITTED':
      return 2;
    case 'VERIFYING':
      return 3;
    case 'COMPLETE':
    case 'REVIEW_REQUIRED':
    case 'RESOLVED':
      return 4;
    default:
      return 2;
  }
}

export function ActivePromiseSpotlight({
  promise,
  promiseId: propId,
  title: propTitle,
  amount: propAmount,
  orderId: propOrderId,
  confidence: propConfidence,
  currentStep: propStep,
}: ActivePromiseSpotlightProps) {
  const steps = ['Created', 'Paid', 'Delivered', 'AI Verify', 'Resolve'];

  const id = promise?.promiseId || propId || 'PP-8F72X-2026';
  const title = promise?.title || propTitle || 'E-commerce website development';
  const amount = promise
    ? `$${promise.amount?.value || '0.00'} ${promise.amount?.currencyCode || 'USD'}`
    : propAmount || '$500.00 USD';
  const orderId = promise?.paymentState === 'CAPTURED'
    ? 'CAPTURED (Sandbox)'
    : propOrderId || 'PAYPAL-ESCR-01';
  const confidence = promise?.outcome === 'COMPLETE'
    ? 98
    : promise?.outcome === 'REVIEW_REQUIRED'
    ? 64
    : propConfidence ?? 92;
  const currentStep = promise ? getStepFromStatus(promise.status) : (propStep ?? 2);

  const category = promise?.category || 'digital_project';
  const Icon = category === 'digital_project' ? Laptop : category === 'delivery' ? Package : FileText;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Active Promise Spotlight
        </h3>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0070BA] border border-blue-200">
          {promise?.status || 'In Progress'}
        </span>
      </div>

      {/* Item summary */}
      <div className="flex items-center gap-3 mb-4 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0070BA] border border-blue-200/70 shadow-2xs">
          <Icon className="h-5 w-5" />
        </div>
        <div className="overflow-hidden">
          <span className="font-mono text-xs font-black text-[#0070BA]">
            {id}
          </span>
          <p className="text-xs font-bold text-slate-900 truncate" title={title}>
            {title}
          </p>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mb-4 py-2">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-2.5 left-2 right-2 h-0.5 bg-slate-200 -z-0" />

          {steps.map((st, i) => {
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <div key={st} className="flex flex-col items-center relative z-10">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#0070BA] text-white shadow-2xs'
                      : isCurrent
                      ? 'bg-cyan-500 text-white ring-4 ring-cyan-100 animate-pulse'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] ${
                    isCurrent
                      ? 'text-[#0070BA] font-black'
                      : isCompleted
                      ? 'text-slate-700 font-semibold'
                      : 'text-slate-400'
                  }`}
                >
                  {st}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metadata Attributes */}
      <div className="space-y-2 mb-4 text-xs border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <PayPalLogo height={12} variant="monogram" />
            <span>Escrow State</span>
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-800">
            {orderId}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span>Amount</span>
          <span className="font-mono font-black text-slate-900 text-sm">{amount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
            <span>AI Verification Status</span>
          </span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px]">
            {promise?.outcome ? `${promise.outcome} (${confidence}%)` : `${confidence}% confidence`}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <Link
        href={`/promises/${id}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070BA] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#003087] transition-all hover:shadow-lg active:scale-98"
      >
        <span>Inspect Promise Contract</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
