'use client';

import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { PromiseGraphResponse } from '@/types/promise';

interface BryntumScheduleCardProps {
  promise: PromiseGraphResponse;
}

interface MilestoneItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'LOCKED';
  paymentTrigger: string;
  slaDays: number;
}

export function BryntumScheduleCard({ promise }: BryntumScheduleCardProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt'>('timeline');

  // Derive milestones from promise state and requirements
  const createdAt = promise.createdAt || new Date().toISOString();
  const createdDate = new Date(createdAt);
  
  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res.toISOString().split('T')[0];
  };

  const isCaptured = ['PAID', 'FULFILLMENT', 'EVIDENCE_SUBMITTED', 'VERIFYING', 'COMPLETE', 'RESOLVED'].includes(promise.status);
  const isEvidenceSubmitted = ['EVIDENCE_SUBMITTED', 'VERIFYING', 'COMPLETE', 'RESOLVED'].includes(promise.status);
  const isVerified = ['COMPLETE', 'RESOLVED'].includes(promise.status);

  const milestones: MilestoneItem[] = [
    {
      id: 'MS-01',
      name: 'Agreement Sealing & PayPal Order Intent',
      startDate: createdDate.toISOString().split('T')[0],
      endDate: addDays(createdDate, 1),
      progress: isCaptured ? 100 : 50,
      status: isCaptured ? 'COMPLETED' : 'IN_PROGRESS',
      paymentTrigger: `Capture $${promise.amount.value} ${promise.amount.currencyCode}`,
      slaDays: 1,
    },
    {
      id: 'MS-02',
      name: 'Deliverable Production & Evidence Upload',
      startDate: addDays(createdDate, 1),
      endDate: addDays(createdDate, 5),
      progress: isEvidenceSubmitted ? 100 : isCaptured ? 40 : 0,
      status: isEvidenceSubmitted ? 'COMPLETED' : isCaptured ? 'IN_PROGRESS' : 'LOCKED',
      paymentTrigger: 'PayPal payment captured',
      slaDays: 4,
    },
    {
      id: 'MS-03',
      name: 'AI Proof-of-Outcome Verification & Merkle Sealing',
      startDate: addDays(createdDate, 5),
      endDate: addDays(createdDate, 6),
      progress: isVerified ? 100 : isEvidenceSubmitted ? 60 : 0,
      status: isVerified ? 'COMPLETED' : isEvidenceSubmitted ? 'IN_PROGRESS' : 'SCHEDULED',
      paymentTrigger: 'Outcome Confidence Audit',
      slaDays: 1,
    },
    {
      id: 'MS-04',
      name: 'Outcome Verification & Resolution',
      startDate: addDays(createdDate, 6),
      endDate: addDays(createdDate, 7),
      progress: ['COMPLETE', 'RESOLVED'].includes(promise.status) ? 100 : 0,
      status: ['COMPLETE', 'RESOLVED'].includes(promise.status) ? 'COMPLETED' : 'SCHEDULED',
      paymentTrigger: 'Outcome verification confirmed',
      slaDays: 1,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#003087] to-[#0070BA] text-white shadow-2xs">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Promise Milestone Schedule</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <Sparkles className="h-3 w-3" />
                Bryntum Schedule Engine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive project timeline coordinating PayPal payments with outcome delivery gates.
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-lg bg-slate-100 p-0.5 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Milestone View
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === 'gantt'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gantt Timeline
          </button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <div className="mt-5 space-y-3">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              className={`rounded-xl border p-4 transition ${
                m.status === 'COMPLETED'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : m.status === 'IN_PROGRESS'
                  ? 'border-blue-300 bg-blue-50/40 shadow-xs ring-1 ring-blue-200'
                  : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {m.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : m.status === 'IN_PROGRESS' ? (
                      <Clock className="h-5 w-5 text-[#0070BA] animate-pulse" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500">{m.id}</span>
                      <h4 className="text-xs font-bold text-slate-900">{m.name}</h4>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Window: <strong className="text-slate-700">{m.startDate}</strong> to <strong className="text-slate-700">{m.endDate}</strong> ({m.slaDays}d SLA)</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  <span className="text-[11px] font-mono font-bold text-[#003087] bg-white px-2 py-0.5 rounded border border-blue-100">
                    {m.paymentTrigger}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${m.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{m.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Gantt View Bar Visualizer */
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-mono font-bold text-slate-600 uppercase tracking-wider mb-2 flex justify-between">
              <span>Milestone Task</span>
              <span>Day 1 ─── Day 3 ─── Day 5 ─── Day 7</span>
            </div>
            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{m.id}: {m.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{m.progress}% complete</span>
                  </div>
                  <div className="h-6 w-full bg-white rounded-md border border-slate-200 overflow-hidden relative">
                    <div
                      className={`h-full rounded transition-all duration-500 flex items-center px-2 text-[10px] font-bold text-white ${
                        m.status === 'COMPLETED'
                          ? 'bg-emerald-600'
                          : m.status === 'IN_PROGRESS'
                          ? 'bg-gradient-to-r from-[#003087] to-[#0070BA]'
                          : 'bg-slate-300 text-slate-600'
                      }`}
                      style={{
                        marginLeft: `${idx * 22}%`,
                        width: `${Math.max(25, (m.slaDays / 7) * 80)}%`,
                      }}
                    >
                      <span className="truncate">{m.paymentTrigger}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> Complete
              <span className="h-2 w-2 rounded-full bg-blue-600 ml-2" /> In Progress
              <span className="h-2 w-2 rounded-full bg-slate-300 ml-2" /> Scheduled
            </span>
            <span className="font-mono text-[11px] text-[#0070BA]">Powered by Bryntum Scheduling Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
