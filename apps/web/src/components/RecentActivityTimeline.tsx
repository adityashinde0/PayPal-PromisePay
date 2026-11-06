'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  UploadCloud,
  Sparkles,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PromiseSummaryResponse } from '@/types/promise';

interface RecentActivityTimelineProps {
  promises?: PromiseSummaryResponse[];
  onViewAll?: () => void;
}

export function RecentActivityTimeline({ promises = [], onViewAll }: RecentActivityTimelineProps) {
  // If promises are provided, construct recent events dynamically
  const events = promises.length > 0
    ? promises.slice(0, 4).map((p) => {
        if (p.paymentState === 'CAPTURED') {
          return {
            id: p.promiseId,
            title: `PayPal Payment Captured (${p.promiseId})`,
            desc: `$${p.amount?.value || '0.00'} captured via PayPal for "${p.title}"`,
            time: 'Recently',
            icon: CheckCircle2,
            iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          };
        }
        if (p.status === 'EVIDENCE_SUBMITTED' || p.status === 'FULFILLMENT') {
          return {
            id: p.promiseId,
            title: `Delivery Proof Uploaded (${p.promiseId})`,
            desc: `Evidence registered for "${p.title}"`,
            time: 'Active',
            icon: UploadCloud,
            iconColor: 'bg-blue-50 text-[#0070BA] border-blue-200',
          };
        }
        if (p.status === 'VERIFYING' || p.outcome === 'COMPLETE') {
          return {
            id: p.promiseId,
            title: `Gemini AI Audited (${p.promiseId})`,
            desc: `Outcome: ${p.outcome || 'IN_PROGRESS'} on contractual requirements`,
            time: 'Verified',
            icon: Sparkles,
            iconColor: 'bg-purple-50 text-purple-600 border-purple-200',
          };
        }
        return {
          id: p.promiseId,
          title: `Contract Created (${p.promiseId})`,
          desc: `Status: ${p.status} - "${p.title}"`,
          time: 'Active',
          icon: Clock,
          iconColor: 'bg-slate-50 text-slate-500 border-slate-200',
        };
      })
    : [
        {
          id: 'canonical-1-digital',
          title: 'Payment Completed',
          desc: '$500.00 captured via PayPal (Sandbox)',
          time: 'Active',
          icon: CheckCircle2,
          iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        },
        {
          id: 'canonical-2-doc',
          title: 'Delivery Submitted',
          desc: 'Evidence uploaded (URLs, files)',
          time: 'Active',
          icon: UploadCloud,
          iconColor: 'bg-blue-50 text-[#0070BA] border-blue-200',
        },
        {
          id: 'canonical-3-physical',
          title: 'AI Verification in Progress',
          desc: 'Analyzing delivery against promise...',
          time: 'Active',
          icon: Sparkles,
          iconColor: 'bg-purple-50 text-purple-600 border-purple-200',
        },
      ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Recent Activity
        </h3>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-[#0070BA] hover:text-[#003087] transition-colors"
          >
            View All
          </button>
        ) : (
          <Link
            href="/#ledger"
            className="text-xs font-semibold text-[#0070BA] hover:text-[#003087] transition-colors"
          >
            View All
          </Link>
        )}
      </div>

      <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
        {events.map((ev, index) => {
          const Icon = ev.icon;
          return (
            <Link
              key={`${ev.id}-${index}`}
              href={`/promises/${ev.id}`}
              className="flex items-start gap-3 relative z-10 group block hover:bg-slate-50/80 p-1.5 -m-1.5 rounded-xl transition-colors"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${ev.iconColor} shadow-2xs`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#0070BA] truncate transition-colors">
                    {ev.title}
                  </p>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {ev.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                  {ev.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
