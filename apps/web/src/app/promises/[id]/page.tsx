'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PromiseGraphResponse, PromiseStatus } from '@/types/promise';
import { fetchPromise, createPaymentOrder, capturePaymentOrder } from '@/lib/api';

const STATUS_STEPS: PromiseStatus[] = [
  'DRAFT',
  'READY_FOR_PAYMENT',
  'PAID',
  'FULFILLMENT',
  'EVIDENCE_SUBMITTED',
  'VERIFYING',
  'COMPLETE',
];

export default function PromiseDetailPage() {
  const params = useParams();
  const promiseId = params.id as string;
  const [promise, setPromise] = useState<PromiseGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPromise = async () => {
    try {
      setLoading(true);
      const data = await fetchPromise(promiseId);
      setPromise(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load promise');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promiseId) loadPromise();
  }, [promiseId]);

  const handleSandboxPayment = async () => {
    if (!promise) return;
    setPaying(true);
    setError(null);
    try {
      // Step 1: Create Order
      const order = await createPaymentOrder(promise.promiseId);
      // Step 2: Capture Order
      const capture = await capturePaymentOrder(promise.promiseId, order.paypalOrderId);
      setPaymentSuccessMessage(
        `Payment successful! Captured via PayPal Sandbox (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
      );
      // Reload promise to update state to PAID
      await loadPromise();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment process failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading && !promise) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0070BA] border-r-transparent"></div>
        <p className="mt-3 text-sm text-slate-500">Loading Promise Graph...</p>
      </div>
    );
  }

  if (error && !promise) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-base font-bold text-red-800">Promise Not Found</h3>
        <p className="mt-1 text-sm text-red-600">{error || `Could not find promise ${promiseId}`}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
          &larr; Back to Promise Ledger
        </Link>
      </div>
    );
  }

  if (!promise) return null;

  const currentStepIdx = STATUS_STEPS.indexOf(promise.status);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          &larr; Promise Ledger
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded border">
            Version: v{promise.currentVersion}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              promise.status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            {promise.status}
          </span>
        </div>
      </div>

      {paymentSuccessMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center justify-between">
          <span>{paymentSuccessMessage}</span>
          <button
            onClick={() => setPaymentSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold font-mono text-slate-900">{promise.promiseId}</h2>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
                {promise.category.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-slate-800">{promise.title}</p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Locked Amount</span>
            <p className="text-3xl font-extrabold text-[#003087]">
              ${promise.amount.value} <span className="text-sm font-normal text-slate-500">{promise.amount.currencyCode}</span>
            </p>
          </div>
        </div>

        {/* Lifecycle Stepper */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Lifecycle Progress</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {STATUS_STEPS.map((s, idx) => {
              const isPast = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div
                  key={s}
                  className={`rounded-lg p-2 text-center text-xs font-medium border ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : isPast
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Requirements and Payment State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atomic Requirements (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Atomic Requirements</h3>
            <span className="text-xs text-slate-500">
              {promise.requirements.length} checkpoint{promise.requirements.length === 1 ? '' : 's'} defined
            </span>
          </div>

          <div className="space-y-3">
            {promise.requirements.map((req, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {req.key}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                  </div>
                  <span className="text-[11px] font-mono rounded bg-slate-50 px-2 py-0.5 text-slate-500 border">
                    {req.verificationMethod}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Payment & Verification State */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900">PayPal Payment Linkage</h4>
            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Payment State:</span>
                <span className={`font-semibold ${promise.payment.state === 'CAPTURED' ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {promise.payment.state}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">PayPal Order ID:</span>
                <span className="font-mono text-slate-800 text-[11px]">
                  {promise.payment.paypalOrderId || 'Pending Checkout'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Capture ID:</span>
                <span className="font-mono text-slate-800 text-[11px]">
                  {promise.payment.paypalCaptureId || 'None'}
                </span>
              </div>
            </div>

            {/* Action Area based on status */}
            {promise.status === 'READY_FOR_PAYMENT' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 text-xs text-blue-800">
                  Requirements are locked. Complete checkout with PayPal Sandbox to fund this agreement.
                </div>
                <button
                  onClick={handleSandboxPayment}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0070BA] hover:bg-[#003087] text-white py-2.5 px-4 text-xs font-bold shadow transition-colors disabled:opacity-50"
                >
                  {paying ? (
                    'Processing PayPal Sandbox Capture...'
                  ) : (
                    <>
                      <span>Pay with</span>
                      <span className="font-extrabold italic text-amber-300">PayPal</span>
                      <span>Sandbox (${promise.amount.value})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {promise.status === 'PAID' && (
              <div className="pt-2 border-t border-slate-100">
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800">
                  Payment confirmed! Fulfillment is in progress. The seller may now submit verification evidence.
                </div>
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Audit Trail</h4>
            <div className="space-y-3 text-xs">
              {promise.timeline.map((event, idx) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-3 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">{event.actor}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="font-medium text-slate-800">{event.eventType}</p>
                  <p className="text-slate-500">{event.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
