'use client';

import React, { useState, useEffect } from 'react';
import { PromiseGraphResponse, ResolutionCase } from '@/types/promise';
import { executeCaseRefund } from '@/lib/api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolutionCase: ResolutionCase;
  promise: PromiseGraphResponse;
  onSuccess: (result: any) => Promise<void>;
}

export function RefundModal({
  isOpen,
  onClose,
  resolutionCase,
  promise,
  onSuccess,
}: RefundModalProps) {
  const [refundReason, setRefundReason] = useState('Full outcome refund authorized by reviewer.');
  const [executingRefund, setExecutingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

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
    setExecutingRefund(true);
    setRefundError(null);
    try {
      const idempKey = `ref_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const result = await executeCaseRefund(
        resolutionCase.caseId,
        {
          reason: refundReason.trim(),
          amountValue: promise.amount.value,
          actor: 'reviewer@promisepay.example',
        },
        idempKey
      );
      await onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Failed to execute PayPal refund');
    } finally {
      setExecutingRefund(false);
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
            <h3 className="text-lg font-bold text-slate-900">Execute PayPal Sandbox Refund</h3>
            <p className="text-xs text-slate-500">
              Deterministic escrow refund for Case {resolutionCase.caseId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {refundError && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            {refundError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-900 space-y-1">
            <p className="font-bold">Refund Summary:</p>
            <p>
              Amount: <span className="font-bold">${promise.amount.value} {promise.amount.currencyCode}</span>
            </p>
            <p>
              PayPal Capture ID:{' '}
              <span className="font-mono">{promise.payment.paypalCaptureId || 'Active Escrow'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Official Refund Reason</label>
            <textarea
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
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
              disabled={executingRefund}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {executingRefund ? 'Executing PayPal Refund...' : 'Confirm & Execute Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

