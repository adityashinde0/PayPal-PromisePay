'use client';

import React from 'react';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Atomic Requirements</h3>
        <span className="text-xs text-slate-500">
          {requirements.length} checkpoint{requirements.length === 1 ? '' : 's'} defined
        </span>
      </div>

      <div className="space-y-3">
        {requirements.map((req, idx) => {
          const reqKey = req.id || req.key;
          const hasEvidence = evidenceList.some(
            (e) => e.requirementIds.includes(reqKey) || e.requirementIds.includes(req.key)
          );
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {req.key}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {hasEvidence && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Evidence Linked
                    </span>
                  )}
                  <span className="text-[11px] font-mono rounded bg-slate-50 px-2 py-0.5 text-slate-500 border">
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

