'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { ResolutionCase, ResolutionDecision } from '@/types/promise';
import { useAuth } from '@/context/AuthContext';

interface HumanResolutionCardProps {
  resolutionCase: ResolutionCase | null;
  onOpenCase: () => void;
  onRecordDecision: (decision: ResolutionDecision, reason: string) => Promise<void>;
  onExecuteRefund: () => void;
  submittingDecision: boolean;
}

export function HumanResolutionCard({
  resolutionCase,
  onOpenCase,
  onRecordDecision,
  onExecuteRefund,
  submittingDecision,
}: HumanResolutionCardProps) {
  const { role } = useAuth();
  const [selectedDecision, setSelectedDecision] = useState<ResolutionDecision>('RECOMMEND_REFUND');
  const [decisionReason, setDecisionReason] = useState('');

  const canOpenCase = role === 'BUYER' || role === 'ADMIN';
  const canAdjudicate = role === 'REVIEWER' || role === 'ADMIN';

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionReason.trim()) return;
    await onRecordDecision(selectedDecision, decisionReason.trim());
    setDecisionReason('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Human Review & Resolution Center</h3>
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              Phase 5
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Human-gated decision governance, case timeline, and PayPal Sandbox refund orchestration.
          </p>
        </div>

        {resolutionCase ? (
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
              resolutionCase.status === 'RESOLVED_REFUNDED'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : resolutionCase.status === 'RESOLVED_COMPLETE'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : resolutionCase.status === 'DECISION_RECORDED'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}
          >
            Case: {resolutionCase.status.replace(/_/g, ' ')}
          </span>
        ) : canOpenCase ? (
          <button
            onClick={onOpenCase}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition"
          >
            + Open Review Case
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500">
            <Lock className="h-3 w-3" />
            <span>Buyer Case Action (Role: {role})</span>
          </div>
        )}
      </div>

      {!resolutionCase ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50 space-y-2">
          <p className="text-xs font-semibold text-slate-700">No Active Dispute or Review Case</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            If automated verification flags gaps or a party disputes the deliverables, open a resolution case. Authorized human reviewers can adjudicate outcomes or initiate refunds.
          </p>
          <button
            onClick={onOpenCase}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            Open Formal Review Case
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Case Info Summary */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-2">
              <span className="font-mono font-bold text-slate-800 text-xs">
                {resolutionCase.caseId}
              </span>
              <span className="text-[11px] text-slate-500">
                Opened by <strong className="text-slate-700">{resolutionCase.submitter}</strong> ({resolutionCase.submitterRole}) on{' '}
                {new Date(resolutionCase.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-600 block text-[11px] uppercase">Declared Issue / Dispute Reason:</span>
              <p className="text-slate-800 italic mt-0.5">{resolutionCase.reason}</p>
            </div>
          </div>

          {/* Refund Executed Confirmation Banner */}
          {resolutionCase.status === 'RESOLVED_REFUNDED' && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <span>&#10004; PayPal Sandbox Refund Executed</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div>
                  <span className="text-rose-600 uppercase text-[10px] block">PayPal Refund ID</span>
                  <strong>{resolutionCase.paypalRefundId}</strong>
                </div>
                <div>
                  <span className="text-rose-600 uppercase text-[10px] block">Amount Returned</span>
                  <strong>${resolutionCase.refundedAmount} USD</strong>
                </div>
                <div>
                  <span className="text-rose-600 uppercase text-[10px] block">Settled At</span>
                  <span>{resolutionCase.refundedAt ? new Date(resolutionCase.refundedAt).toLocaleTimeString() : 'Completed'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reviewer Decision Recorded Box */}
          {resolutionCase.decision && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-xs text-indigo-950 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-[11px] text-indigo-700">Human Reviewer Decision:</span>
                  <span className="rounded bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 text-xs">
                    {resolutionCase.decision}
                  </span>
                </div>
                <span className="text-[11px] text-indigo-600">
                  by {resolutionCase.decisionBy}
                </span>
              </div>
              <p className="text-indigo-900 leading-relaxed font-normal">
                <strong>Justification:</strong> {resolutionCase.decisionReason}
              </p>

              {/* Human Gate: Trigger Refund Button when RECOMMEND_REFUND confirmed */}
              {resolutionCase.decision === 'RECOMMEND_REFUND' && resolutionCase.status !== 'RESOLVED_REFUNDED' && (
                <div className="mt-3 pt-3 border-t border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-indigo-900 text-xs">
                      Reviewer has formally recommended a refund.
                    </p>
                    <p className="text-[11px] text-indigo-700">
                      Preconditions validated: Human decision signed off. Ready for PayPal Sandbox settlement.
                    </p>
                  </div>
                  {canAdjudicate ? (
                    <button
                      onClick={onExecuteRefund}
                      className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition whitespace-nowrap"
                    >
                      Execute PayPal Refund &rarr;
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                      Arbitrator Role Required to Refund
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reviewer Adjudication Form (shown if case not resolved) */}
          {resolutionCase.status !== 'RESOLVED_REFUNDED' && resolutionCase.status !== 'RESOLVED_COMPLETE' && (
            <form onSubmit={handleDecisionSubmit} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Record Authorized Human Reviewer Decision
              </h4>
              <p className="text-[11px] text-slate-500">
                AI outputs are non-authoritative recommendations. An authorized human must explicitly record justification.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { val: 'RECOMMEND_REFUND', label: 'Recommend Refund (PayPal Sandbox)', desc: 'Precondition for issuing refund' },
                  { val: 'MARK_COMPLETE', label: 'Mark Complete', desc: 'Accept deliverable & settle agreement' },
                  { val: 'REQUEST_EVIDENCE', label: 'Request Evidence', desc: 'Return agreement to seller for artifacts' },
                  { val: 'OPEN_REVIEW', label: 'Extend Investigation', desc: 'Keep under active review' },
                ].map((opt) => (
                  <label
                    key={opt.val}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition ${
                      selectedDecision === opt.val
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={opt.val}
                      checked={selectedDecision === opt.val}
                      onChange={(e) => setSelectedDecision(e.target.value as ResolutionDecision)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">{opt.label}</span>
                      <span className="text-[11px] text-slate-500">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Mandatory Human Justification Notes *
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Explain rationale for this decision citing specific evidence or requirement findings..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {!canAdjudicate && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Only Arbitrators / Reviewers can record binding decisions. Switch persona in top menu to test.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingDecision || !canAdjudicate}
                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {submittingDecision ? 'Persisting Decision...' : 'Confirm Reviewer Decision'}
              </button>
            </form>
          )}

          {/* Case Audit Timeline */}
          {resolutionCase.timeline && resolutionCase.timeline.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Case Decision Log ({resolutionCase.timeline.length})
              </span>
              <div className="space-y-2">
                {resolutionCase.timeline.map((ev, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 p-2.5 text-xs flex justify-between items-start gap-2 border">
                    <div>
                      <span className="font-bold text-slate-800">{ev.action}</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">{ev.notes}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

