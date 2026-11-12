'use client';

import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { Ban, Clock, CheckCircle2 } from 'lucide-react';
import { PromiseGraphResponse } from '@/types/promise';
import { PayPalLogo } from '../PayPalLogo';

interface PaymentEscrowCardProps {
  promise: PromiseGraphResponse;
  onCreateOrder: () => Promise<string>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (errorMsg: string) => void;
  onCancel: () => void;
  paying: boolean;
  onAddEvidence: () => void;
  onDirectPaySandbox?: () => Promise<void>;
  onOpenCancelModal?: () => void;
  onConfirmDraft?: () => Promise<void>;
  confirmingDraft?: boolean;
}

export function PaymentEscrowCard({
  promise,
  onCreateOrder,
  onApprove,
  onError,
  onCancel,
  paying,
  onAddEvidence,
  onDirectPaySandbox,
  onOpenCancelModal,
  onConfirmDraft,
  confirmingDraft = false,
}: PaymentEscrowCardProps) {
  const isCaptured = promise.payment.state === 'CAPTURED';
  const isRefunded = promise.payment.state === 'REFUNDED';
  const isCancelled = promise.status === 'CANCELLED';
  const isDraft = promise.status === 'DRAFT';
  const isReady = promise.status === 'READY_FOR_PAYMENT';
  const canAddEvidence =
    (isCaptured || promise.status === 'PAID' || promise.status === 'EVIDENCE_SUBMITTED') &&
    !isCancelled &&
    !isRefunded;

  const isOrderSimulated = !!promise.payment.paypalOrderId?.startsWith('MOCK_');
  const isCaptureSimulated = !!promise.payment.paypalCaptureId?.startsWith('MOCK_');
  const isSimulated = isOrderSimulated || isCaptureSimulated;

  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Fallback PayPal client ID: use env or verified Sandbox client ID
  const paypalClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    'BAAcPbc0EPk7_mH3sIOg_D9T0NInRRl5CYvLSrmVcIxSF0VxALdJ4NEL6iDjTQzXOZpFJwZ1hCbCaOUHvc';

  const currency = promise.amount?.currencyCode || 'USD';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">PayPal Payment Linkage</h4>
        <PayPalLogo height={16} variant="monogram" />
      </div>

      {isSimulated && (
        <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-300 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] text-amber-900 border border-amber-400">
              Simulated Demo Mode
            </span>
            <span>Simulated payment (no PayPal funds moved)</span>
          </div>
        </div>
      )}

      <div className="text-xs space-y-2 text-slate-600">
        <div className="flex justify-between items-center py-1 border-b border-slate-100">
          <span className="text-slate-400">Payment State:</span>
          <div className="flex items-center gap-1.5">
            {isSimulated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                Simulated Demo Mode
              </span>
            )}
            <span
              className={`font-semibold ${
                isRefunded
                  ? 'text-rose-700 font-bold'
                  : isSimulated
                  ? 'text-amber-800'
                  : isCaptured
                  ? 'text-emerald-700'
                  : 'text-slate-800'
              }`}
            >
              {promise.payment.state}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-100">
          <span className="text-slate-400">PayPal Order ID:</span>
          <div className="flex items-center gap-1.5">
            {isOrderSimulated && (
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200">
                Simulated
              </span>
            )}
            <span className="font-mono text-slate-800 text-[11px]">
              {promise.payment.paypalOrderId || 'Pending Checkout'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-100">
          <span className="text-slate-400">Capture ID:</span>
          <div className="flex items-center gap-1.5">
            {isCaptureSimulated && (
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-200">
                Simulated
              </span>
            )}
            <span className="font-mono text-slate-800 text-[11px]">
              {promise.payment.paypalCaptureId || 'None'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-slate-400">Payment Status:</span>
          <span
            className={`font-semibold text-[11px] ${
              promise.payment.state === 'FAILED'
                ? 'text-rose-700'
                : isSimulated
                ? 'text-amber-800'
                : isCaptured
                ? 'text-emerald-700'
                : 'text-blue-700'
            }`}
          >
            {promise.payment.paymentMode ||
              (promise.payment.state === 'FAILED'
                ? 'Payment Failed'
                : isSimulated
                ? 'Simulated Demo Mode'
                : isCaptured
                ? 'PayPal payment captured'
                : 'Pending Buyer Checkout')}
          </span>
        </div>
      </div>

      {promise.payment.failureReason && (
        <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-800 space-y-1">
          <span className="font-bold block">Payment Error:</span>
          <p className="font-mono text-[11px] break-words">{promise.payment.failureReason}</p>
        </div>
      )}

      {checkoutNotice && (
        <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-800">
          {checkoutNotice}
        </div>
      )}

      {/* Refunded Banner */}
      {isRefunded && (
        <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>↩️</span>
            <span>Refund issued through PayPal</span>
          </div>
          <p className="text-[11px] text-rose-700">
            Funds of ${promise.amount.value} {promise.amount.currencyCode} have been returned to the buyer via PayPal.
          </p>
        </div>
      )}

      {/* Cancelled Unpaid Banner */}
      {isCancelled && !isRefunded && (
        <div className="rounded-lg bg-slate-100 p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-slate-800">
            <Ban className="h-4 w-4 text-rose-500 shrink-0" />
            <span>Agreement Cancelled</span>
          </div>
          <p className="text-[11px] text-slate-600">
            This agreement was cancelled before payment was captured. No charge was incurred.
          </p>
        </div>
      )}

      {/* Draft Confirmation Action */}
      {isDraft && !isCancelled && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900">
            <span className="font-bold block">Draft Requirements Pending Confirmation</span>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Lock atomic requirements to enable PayPal buyer checkout for this agreement.
            </p>
          </div>
          {onConfirmDraft && (
            <button
              type="button"
              onClick={onConfirmDraft}
              disabled={confirmingDraft}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2.5 px-4 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{confirmingDraft ? 'Locking Terms...' : 'Lock Requirements & Open for Payment'}</span>
            </button>
          )}
        </div>
      )}

      {/* Action Area based on status */}
      {isReady && !isCancelled && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 text-xs text-blue-800">
            Requirements are locked. Buyer must approve checkout in the official PayPal window to complete payment.
          </div>

          <div className="paypal-button-container relative min-h-[45px]">
            <PayPalScriptProvider
              options={{
                clientId: paypalClientId,
                currency: currency,
                intent: 'capture',
              }}
            >
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'pay',
                  height: 40,
                }}
                disabled={paying}
                createOrder={async () => {
                  setCheckoutNotice('Initializing official PayPal checkout order...');
                  try {
                    const orderId = await onCreateOrder();
                    setCheckoutNotice(null);
                    return orderId;
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to create PayPal order';
                    setCheckoutNotice(null);
                    onError(msg);
                    throw err;
                  }
                }}
                onApprove={async (data) => {
                  setCheckoutNotice('Payer approval received. Capturing PayPal payment...');
                  try {
                    await onApprove(data.orderID);
                    setCheckoutNotice(null);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Capture failed';
                    setCheckoutNotice(null);
                    onError(msg);
                  }
                }}
                onCancel={() => {
                  setCheckoutNotice('PayPal checkout was cancelled by the buyer.');
                  onCancel();
                  setTimeout(() => setCheckoutNotice(null), 4000);
                }}
                onError={(err) => {
                  setCheckoutNotice(null);
                  const msg = (err as { message?: string })?.message || String(err || '');
                  if (msg.includes('Component closed') || msg.includes('paypal_js_sdk')) {
                    return;
                  }
                  onError(`PayPal Error: ${(err as { message?: string })?.message || 'Transaction could not be completed'}`);
                }}
              />
            </PayPalScriptProvider>
          </div>

          {onDirectPaySandbox && process.env.NEXT_PUBLIC_PAYPAL_DEMO_MODE === 'true' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onDirectPaySandbox}
                disabled={paying}
                className="text-[11px] text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
              >
                {paying ? 'Processing...' : 'Simulated demo action — no PayPal payment'}
              </button>
            </div>
          )}
        </div>
      )}

      {canAddEvidence && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {isSimulated ? (
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-300 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] text-amber-900 border border-amber-400">
                  Simulated Demo Mode
                </span>
                <span>Simulated Payment Active</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Payment simulated with mock identifiers. No real PayPal charge was executed.
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800">
              PayPal payment captured! Outcome verification active.
            </div>
          )}
          <button
            onClick={onAddEvidence}
            className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold shadow transition"
          >
            + Add More Evidence
          </button>
        </div>
      )}

      {/* Cancellation / Non-Delivery Refund Action */}
      {onOpenCancelModal && !isCancelled && !isRefunded && promise.status !== 'COMPLETE' && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenCancelModal}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 py-1.5 text-xs font-semibold text-rose-800 transition shadow-2xs"
          >
            <Clock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            <span>
              {isCaptured
                ? 'Cancel Agreement & Refund via PayPal'
                : 'Cancel Agreement'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
