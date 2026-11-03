'use client';

import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
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
}: PaymentEscrowCardProps) {
  const isCaptured = promise.payment.state === 'CAPTURED';
  const isReady = promise.status === 'READY_FOR_PAYMENT';
  const canAddEvidence =
    isCaptured || promise.status === 'PAID' || promise.status === 'EVIDENCE_SUBMITTED';

  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Fallback PayPal client ID: use env or sandbox test ID
  const paypalClientId =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    'sb-b7szm53645276@business.example.com';

  const currency = promise.amount?.currencyCode || 'USD';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">PayPal Payment Linkage</h4>
        <PayPalLogo height={16} variant="monogram" />
      </div>

      <div className="text-xs space-y-2 text-slate-600">
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-400">Payment State:</span>
          <span
            className={`font-semibold ${
              isCaptured ? 'text-emerald-700' : 'text-slate-800'
            }`}
          >
            {promise.payment.state}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-400">PayPal Order ID:</span>
          <span className="font-mono text-slate-800 text-[11px]">
            {promise.payment.paypalOrderId || 'Pending Checkout'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100">
          <span className="text-slate-400">Capture ID:</span>
          <span className="font-mono text-slate-800 text-[11px]">
            {promise.payment.paypalCaptureId || 'None'}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-400">Escrow Mechanism:</span>
          <span className="font-medium text-blue-700 text-[11px]">
            PPCP Delayed Conditional Escrow
          </span>
        </div>
      </div>

      {checkoutNotice && (
        <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-800">
          {checkoutNotice}
        </div>
      )}

      {/* Action Area based on status */}
      {isReady && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 text-xs text-blue-800">
            Requirements are locked. Buyer must approve checkout via the official PayPal modal to hold funds in conditional escrow.
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
                  setCheckoutNotice('Payer approval received. Capturing into conditional escrow...');
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
                  onError(`PayPal Modal Error: ${err?.message || 'Transaction could not be completed'}`);
                }}
              />
            </PayPalScriptProvider>
          </div>

          {onDirectPaySandbox && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onDirectPaySandbox}
                disabled={paying}
                className="text-[11px] text-slate-500 underline hover:text-slate-800 disabled:opacity-50"
              >
                {paying ? 'Processing...' : 'Direct Sandbox Express Capture (Dev Only)'}
              </button>
            </div>
          )}
        </div>
      )}

      {canAddEvidence && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800">
            Payment confirmed! Fulfillment and proof verification are active.
          </div>
          <button
            onClick={onAddEvidence}
            className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold shadow transition"
          >
            + Add More Evidence
          </button>
        </div>
      )}
    </div>
  );
}
