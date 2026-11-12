'use client';

import React from 'react';
import { CheckSquare2, FileCheck, ShieldCheck } from 'lucide-react';
import { AtomicRequirement, EvidenceItem } from '@/types/promise';

interface AtomicRequirementsCardProps {
  requirements: AtomicRequirement[];
  evidenceList: EvidenceItem[];
}

export function AtomicRequirementsCard({
  requirements,
  evidenceList,
}: AtomicRequirementsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0070BA]">
            <CheckSquare2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Atomic Requirements</h3>
            <p className="text-xs text-slate-500">Contractual deliverables governed by automated outcome checks</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {requirements.length} checkpoint{requirements.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {requirements.map((req, idx) => {
          const reqKey = req.id || req.key;
          const hasEvidence = evidenceList.some(
            (e) => e.requirementIds.includes(reqKey) || e.requirementIds.includes(req.key)
          );
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 shrink-0">
                    {req.key}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{req.title}</h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasEvidence ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="h-3 w-3" />
                      Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      Pending
                    </span>
                  )}
                  <span className="text-[10px] font-mono rounded bg-white px-1.5 py-0.5 text-slate-500 border border-slate-200">
                    {req.verificationMethod}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

