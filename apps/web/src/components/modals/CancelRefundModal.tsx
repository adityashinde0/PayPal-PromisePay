'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PromiseGraphResponse } from '@/types/promise';
import { cancelPromiseAndRefund } from '@/lib/api';

interface CancelRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  promise: PromiseGraphResponse;
  onSuccess: (result: {
    status: string;
    refundExecuted: boolean;
    paypalRefundId?: string;
    amount?: string;
    currency?: string;
    reason: string;
  }) => Promise<void>;
}

export function CancelRefundModal({
  isOpen,
  onClose,
  promise,
  onSuccess,
}: CancelRefundModalProps) {
  const isPaid = promise.payment.state === 'CAPTURED';
  const [cancellationType, setCancellationType] = useState<
    'SLA_TIMEOUT_NOT_DELIVERED' | 'USER_CANCELLED'
  >('SLA_TIMEOUT_NOT_DELIVERED');
  const [reason, setReason] = useState(
    'Agreed project deliverables were not provided within the committed timeline/SLA.'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTypeChange = (type: 'SLA_TIMEOUT_NOT_DELIVERED' | 'USER_CANCELLED') => {
    setCancellationType(type);
    if (type === 'SLA_TIMEOUT_NOT_DELIVERED') {
      setReason('Agreed project deliverables were not provided within the committed timeline/SLA.');
    } else {
      setReason('Buyer requested early cancellation of the project terms and deliverables.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await cancelPromiseAndRefund(promise.promiseId, {
        reason: reason.trim(),
        cancellationType,
        actor: 'buyer@promisepay.example',
      });
      await onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cancellation request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                {isPaid ? 'Cancel Agreement & Issue Refund' : 'Cancel Agreement'}
              </h3>
              <p className="text-xs text-rose-700">
                {isPaid
                  ? `Execute automatic PayPal Sandbox refund of $${promise.amount.value} ${promise.amount.currencyCode}`
                  : 'Cancel this agreement before payment execution'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Cancellation Type Selector */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">
              Reason for Cancellation / Return:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('SLA_TIMEOUT_NOT_DELIVERED')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  cancellationType === 'SLA_TIMEOUT_NOT_DELIVERED'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-rose-600" />
                  <span className="text-xs">Late / Not Delivered</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Seller missed agreed delivery deadline or abandoned project.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('USER_CANCELLED')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  cancellationType === 'USER_CANCELLED'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span className="text-xs">User Cancellation</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Parties agreed to cancel before delivery completion.
                </p>
              </button>
            </div>
          </div>

          {/* Justification Text Area */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Explanation & Refund Justification:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason why deliverables were not completed or why cancellation is required..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          {/* Refund Notice Callout */}
          {isPaid && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <RefreshCw className="h-4 w-4 text-amber-700" />
                <span>Automatic PayPal Capture Refund</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                PayPal Capture ID <span className="font-mono font-bold">{promise.payment.paypalCaptureId}</span> will be refunded for{' '}
                <span className="font-bold">${promise.amount.value} {promise.amount.currencyCode}</span>. An immutable audit record is registered on the ledger.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Keep Agreement
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 px-4 py-2 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing Refund via PayPal...</span>
                </>
              ) : isPaid ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Execute Cancellation & Refund</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
