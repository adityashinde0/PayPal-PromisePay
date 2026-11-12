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
                Milestone & SLA Engine
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
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2 pr-4">SLA Milestone</th>
                <th className="py-2 px-4 text-center">Status</th>
                <th className="py-2 pl-4 text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {milestones.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-600 shrink-0">
                        {m.id}
                      </span>
                      <span className="font-semibold text-slate-800 truncate">
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-[#0070BA] border border-blue-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-[#0070BA]'
                            : 'bg-slate-400'
                        }`}
                      />
                      {m.status === 'COMPLETED'
                        ? 'Completed'
                        : m.status === 'IN_PROGRESS'
                        ? 'In Progress'
                        : 'Scheduled'}
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full ${
                            m.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-[#0070BA]'
                          }`}
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700 text-[11px]">
                        {m.progress}%
                      </span>
                      {m.status === 'COMPLETED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 inline" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-400 shrink-0 inline" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <span className="font-mono text-[11px] text-[#0070BA]">PromisePay Milestone & SLA Timeline Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
