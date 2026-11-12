'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Package,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';

export function LifecycleStepper() {
  const steps = [
    {
      num: '1',
      title: '1. Create Promise',
      desc: 'Define what you are paying for',
      icon: ({ className }: { className?: string }) => <FileText className={className} />,
      accent: 'border-blue-200 bg-blue-50/90 text-[#0070BA]',
    },
    {
      num: '2',
      title: '2. Pay with PayPal',
      desc: 'Secure payment (Sandbox)',
      icon: () => (
        <PayPalLogo height={18} variant="monogram" />
      ),
      accent: 'border-indigo-200 bg-indigo-50/90 text-[#003087]',
    },
    {
      num: '3',
      title: '3. Submit Delivery',
      desc: 'Upload evidence (URLs, files, tracking)',
      icon: ({ className }: { className?: string }) => <Package className={className} />,
      accent: 'border-emerald-200 bg-emerald-50/90 text-emerald-700',
    },
    {
      num: '4',
      title: '4. AI Verification',
      desc: 'Match promise with delivery evidence',
      icon: ({ className }: { className?: string }) => <Sparkles className={className} />,
      accent: 'border-purple-200 bg-purple-50/90 text-purple-700',
    },
    {
      num: '5',
      title: '5. Final Outcome',
      desc: 'Completed / Review / Resolution',
      icon: ({ className }: { className?: string }) => <CheckCircle2 className={className} />,
      accent: 'border-teal-200 bg-teal-50/90 text-teal-700',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              The Promise Lifecycle
            </h3>
            <span className="text-xs text-slate-500">
              From agreement to verified outcome — all in one place.
            </span>
          </div>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0070BA] hover:text-[#003087] transition-colors"
        >
          <span>View Full Flow</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 relative">
        {steps.map((step, idx) => {
          const IconComponent = step.icon;
          return (
            <div key={step.num} className="relative group">
              <div className="h-full rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition-all duration-200 hover:bg-white hover:border-[#0070BA]/50 hover:shadow-xs flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${step.accent} mb-2 shadow-2xs`}
                >
                  <IconComponent className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1 group-hover:text-[#0070BA] transition-colors">
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {step.desc}
                </p>
              </div>

              {/* Connecting arrow */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-slate-300 pointer-events-none group-hover:text-[#0070BA] transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
