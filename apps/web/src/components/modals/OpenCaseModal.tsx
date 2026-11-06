'use client';

import React, { useState, useEffect } from 'react';
import { ResolutionCase } from '@/types/promise';
import { openResolutionCase } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface OpenCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
  onSuccess: (caseData: ResolutionCase) => Promise<void>;
}

export function OpenCaseModal({
  isOpen,
  onClose,
  promiseId,
  onSuccess,
}: OpenCaseModalProps) {
  const { user, role } = useAuth();
  const [caseReason, setCaseReason] = useState('');
  const [caseOutcomeRequested, setCaseOutcomeRequested] = useState('REVIEW');
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseReason.trim() || caseReason.trim().length < 5) {
      setCaseError('Please provide a substantive review reason (min 5 characters).');
      return;
    }
    setSubmittingCase(true);
    setCaseError(null);
    try {
      const activeSubmitter = user?.email || 'user@promisepay.example';
      const activeRole = user?.role || role || 'BUYER';

      const createdCase = await openResolutionCase(promiseId, {
        reason: caseReason.trim(),
        requestedOutcome: caseOutcomeRequested,
        submitter: activeSubmitter,
        role: activeRole,
      });
      await onSuccess(createdCase);
      setCaseReason('');
      onClose();
    } catch (err: unknown) {
      setCaseError(err instanceof Error ? err.message : 'Failed to open resolution case');
    } finally {
      setSubmittingCase(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Open Resolution Case</h3>
            <p className="text-xs text-slate-500">Initiates human-reviewed resolution and outcome audit.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {caseError && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            {caseError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-[11px] text-slate-600 flex justify-between items-center">
            <span>Submitting as:</span>
            <span className="font-semibold text-slate-900">{user?.email || 'user@promisepay.example'} ({user?.role || role || 'BUYER'})</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Requested Outcome</label>
            <select
              value={caseOutcomeRequested}
              onChange={(e) => setCaseOutcomeRequested(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
            >
              <option value="REVIEW">Formal Human Review</option>
              <option value="REQUEST_EVIDENCE">Request Evidence Amendment</option>
              <option value="REFUND">Full Refund via PayPal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Substantive Dispute / Review Reason *</label>
            <textarea
              rows={4}
              placeholder="Detail specifically which atomic criteria were not met or why deliverable is disputed..."
              value={caseReason}
              onChange={(e) => setCaseReason(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingCase}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {submittingCase ? 'Submitting...' : 'Open Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
