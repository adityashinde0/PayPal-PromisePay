'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { AuditTimelineEvent, PaymentSummary } from '@/types/promise';

interface PaymentProofCardProps {
  payment: PaymentSummary;
  promiseId: string;
  timeline?: AuditTimelineEvent[];
}

export function PaymentProofCard({
  payment,
  promiseId,
  timeline = [],
}: PaymentProofCardProps) {
  const isOrderSimulated = !!payment.paypalOrderId?.startsWith('MOCK_');
  const isCaptureSimulated = !!payment.paypalCaptureId?.startsWith('MOCK_');
  const isSimulated = isOrderSimulated || isCaptureSimulated;
  const isCaptured = payment.state === 'CAPTURED';
  const isFailed = payment.state === 'FAILED';

  // Truthful classification strictly matching requirement:
  // - Real PayPal Sandbox
  // - Simulated Demo Mode
  // - Payment Failed
  // - Awaiting Buyer Approval
  const paymentMode =
    payment.paymentMode ||
    (isFailed
      ? 'Payment Failed'
      : isSimulated
      ? 'Simulated Demo Mode'
      : isCaptured
      ? 'Real PayPal Sandbox'
      : 'Awaiting Buyer Approval');

  // Find verified webhook event from timeline if present
  const webhookEvent = timeline.find((e) => e.eventType === 'WEBHOOK_SIGNATURE_VERIFIED');

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'Pending';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
        paymentMode === 'Real PayPal Sandbox'
          ? 'border-emerald-200 bg-white'
          : paymentMode === 'Simulated Demo Mode'
          ? 'border-amber-300 bg-amber-50/40'
          : paymentMode === 'Payment Failed'
          ? 'border-rose-200 bg-rose-50/40'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header with Verified Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              paymentMode === 'Real PayPal Sandbox'
                ? 'bg-emerald-50 text-emerald-600'
                : paymentMode === 'Simulated Demo Mode'
                ? 'bg-amber-100 text-amber-800'
                : paymentMode === 'Payment Failed'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {paymentMode === 'Real PayPal Sandbox' ? (
              <ShieldCheck className="h-5 w-5" />
            ) : paymentMode === 'Simulated Demo Mode' ? (
              <AlertTriangle className="h-5 w-5" />
            ) : paymentMode === 'Payment Failed' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Payment Proof & Provenance</h3>
            <p className="text-xs text-slate-500">
              {paymentMode === 'Real PayPal Sandbox'
                ? payment.disbursementMode === 'DELAYED'
                  ? 'Verified Sandbox transaction held in PayPal PPCP Delayed Disbursement'
                  : 'Verified Sandbox transaction (Standard Capture with Platform Milestone Holds)'
                : paymentMode === 'Simulated Demo Mode'
                ? 'Simulated developer demo action (no real PayPal funds transferred)'
                : paymentMode === 'Payment Failed'
                ? 'Transaction could not be completed'
                : 'Order initialized; awaiting buyer authorization in PayPal checkout'}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-3 py-1 text-xs font-bold border ${
            paymentMode === 'Real PayPal Sandbox'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : paymentMode === 'Simulated Demo Mode'
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : paymentMode === 'Payment Failed'
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              paymentMode === 'Real PayPal Sandbox'
                ? 'bg-emerald-500'
                : paymentMode === 'Simulated Demo Mode'
                ? 'bg-amber-500'
                : paymentMode === 'Payment Failed'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          />
          {paymentMode}
        </span>
      </div>

      {/* Failure Banner (if failed) */}
      {payment.failureReason && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 mb-4 text-xs text-rose-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>Payment Capture Error</span>
          </div>
          <p className="font-mono text-[11px] text-rose-800 break-words">
            {payment.failureReason}
          </p>
          <p className="text-[11px] text-rose-700">
            Please retry checkout with a valid PayPal Sandbox payment method.
          </p>
        </div>
      )}

      {/* 4-Step Verification Lifecycle */}
      <div className="mb-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
          Verification Pipeline
        </span>
        <div className="space-y-2.5">
          {/* Step 1: Order Created */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  payment.paypalOrderId
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                1
              </div>
              <span className="font-semibold text-slate-800">Order Created</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-500">
              {payment.paypalOrderId ? 'Generated' : 'Pending'}
            </span>
          </div>

          {/* Step 2: Buyer Approved */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  payment.buyerApproved || isCaptured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                2
              </div>
              <span className="font-semibold text-slate-800">Buyer Approved</span>
            </div>
            <span className="text-[11px] font-mono font-medium text-slate-500">
              {payment.buyerApproved || isCaptured ? 'Authorized' : 'Awaiting'}
            </span>
          </div>

          {/* Step 3: Payment Captured */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCaptured
                    ? 'bg-emerald-100 text-emerald-800'
                    : isFailed
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                3
              </div>
              <span className="font-semibold text-slate-800">Payment Captured</span>
            </div>
            <span
              className={`text-[11px] font-mono font-medium ${
                isCaptured
                  ? 'text-emerald-700'
                  : isFailed
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {isCaptured ? 'Completed' : isFailed ? 'Failed' : 'Pending'}
            </span>
          </div>

          {/* Step 4: Webhook Reconciled */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  payment.webhookVerified
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                4
              </div>
              <span className="font-semibold text-slate-800">Webhook Sync</span>
            </div>
            <span
              className={`text-[11px] font-mono font-medium ${
                payment.webhookVerified ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {payment.webhookVerified ? 'Verified' : 'Awaiting tunnel'}
            </span>
          </div>
        </div>
      </div>

      {/* Provenance Attributes Table */}
      <div className="space-y-2 text-xs divide-y divide-slate-100">
        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">PayPal Order ID</span>
          <div className="flex items-center gap-1.5 font-mono text-slate-800 truncate">
            {isOrderSimulated && (
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-300 shrink-0">
                Simulated
              </span>
            )}
            <span className="font-bold truncate" title={payment.paypalOrderId ?? undefined}>
              {payment.paypalOrderId || 'Pending'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">PayPal Capture ID</span>
          <div className="flex items-center gap-1.5 font-mono text-slate-800 truncate">
            {isCaptureSimulated && (
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 border border-amber-300 shrink-0">
                Simulated
              </span>
            )}
            <span className="font-bold truncate" title={payment.paypalCaptureId ?? undefined}>
              {payment.paypalCaptureId || 'None (Uncaptured)'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">Disbursement Protocol</span>
          <span className="font-semibold text-slate-800 text-[11px] truncate">
            {isSimulated
              ? 'Simulated Demo Escrow'
              : payment.disbursementMode === 'DELAYED'
              ? 'PayPal PPCP Delayed Disbursement'
              : 'Standard Capture (Platform Milestone Holds)'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">Amount & Currency</span>
          <span className="font-bold text-slate-900 font-mono">
            ${parseFloat(payment.amount?.value || '0').toFixed(2)} {payment.amount?.currencyCode || 'USD'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">Order Created At</span>
          <span className="text-slate-700 truncate">{formatTimestamp(payment.createdAt)}</span>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">Captured At</span>
          <span className="text-slate-700 truncate">{formatTimestamp(payment.capturedAt)}</span>
        </div>

        <div className="flex items-center justify-between py-1.5 gap-2">
          <span className="text-slate-500 font-medium shrink-0">Buyer Authorization</span>
          {payment.buyerApproved || isCaptured ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-500 font-medium shrink-0">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Awaiting
            </span>
          )}
        </div>

        <div className="flex flex-col py-1.5 gap-1">
          <span className="text-slate-500 font-medium">Webhook Signature</span>
          {payment.webhookVerified ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Signature verified via PayPal
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
              <Radio className="h-3 w-3 text-amber-600 shrink-0" />
              Awaiting public HTTPS tunnel
            </span>
          )}
        </div>
      </div>

      {/* Webhook Readiness Notice */}
      {!payment.webhookVerified && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-700 font-semibold block mb-0.5">
            Local Webhook Ingestion Notice:
          </strong>
          PromisePay securely verifies inbound PayPal cryptographic signatures at{' '}
          <code className="text-[#0070BA] font-mono bg-white px-1 py-0.5 rounded border border-slate-200">
            /api/webhooks/paypal
          </code>
          . In local development without an active HTTPS tunnel (e.g. ngrok or Cloudflare Tunnel), payments are captured synchronously via buyer popup. When a tunnel is configured in PayPal Developer settings, verified signature receipts are automatically recorded above.
        </div>
      )}

      {/* Verified Webhook Event Log Entry (if verified) */}
      {webhookEvent && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Cryptographic Webhook Receipt Logged</span>
          </div>
          <p className="text-[11px] text-emerald-800">{webhookEvent.summary}</p>
          <span className="text-[10px] text-emerald-600 font-mono">
            {formatTimestamp(webhookEvent.timestamp)}
          </span>
        </div>
      )}
    </div>
  );
}

