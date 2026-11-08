'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, Bell, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  EvidenceItem,
  PromiseGraphResponse,
  PromiseStatus,
  ResolutionCase,
  ResolutionDecision,
  VerificationRun,
} from '@/types/promise';
import {
  capturePaymentOrder,
  createPaymentOrder,
  fetchPromise,
  fetchPromiseEvidence,
  fetchResolutionCase,
  fetchVerificationRun,
  listResolutionCases,
  recordCaseDecision,
  triggerVerification,
} from '@/lib/api';
import { SubmitEvidenceModal } from '@/components/modals/SubmitEvidenceModal';
import { OpenCaseModal } from '@/components/modals/OpenCaseModal';
import { RefundModal } from '@/components/modals/RefundModal';
import { DisputeDossierModal } from '@/components/modals/DisputeDossierModal';
import { CancelRefundModal } from '@/components/modals/CancelRefundModal';
import { AtomicRequirementsCard } from '@/components/promise-detail/AtomicRequirementsCard';
import { BryntumScheduleCard } from '@/components/promise-detail/BryntumScheduleCard';
import { EvidenceVaultCard } from '@/components/promise-detail/EvidenceVaultCard';
import { VerificationReportCard } from '@/components/promise-detail/VerificationReportCard';
import { HumanResolutionCard } from '@/components/promise-detail/HumanResolutionCard';
import { PaymentEscrowCard } from '@/components/promise-detail/PaymentEscrowCard';
import { PaymentProofCard } from '@/components/promise-detail/PaymentProofCard';
import { AuditTimelineCard } from '@/components/promise-detail/AuditTimelineCard';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const [promise, setPromise] = useState<PromiseGraphResponse | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [verificationRun, setVerificationRun] = useState<VerificationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success and Error Banners
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [verificationSuccessMessage, setVerificationSuccessMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [caseSuccessMessage, setCaseSuccessMessage] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [refundSuccessMessage, setRefundSuccessMessage] = useState<string | null>(null);

  // Resolution Case State
  const [resolutionCase, setResolutionCase] = useState<ResolutionCase | null>(null);

  // Real-Time Event Streaming (Goal 4)
  const [streamConnected, setStreamConnected] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<
    Array<{ type: string; message: string; timestamp: string }>
  >([]);
  const [liveToast, setLiveToast] = useState<{ title: string; message: string } | null>(null);

  // Modal States
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showOpenCaseModal, setShowOpenCaseModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Dispute Dossier Export
  const [downloadingDossier, setDownloadingDossier] = useState(false);
  const [dossierSuccess, setDossierSuccess] = useState<string | null>(null);

  const handleDownloadDossier = () => {
    try {
      setDownloadingDossier(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const link = document.createElement('a');
      link.href = `${API_URL}/api/promises/${promiseId}/dispute-defense-dossier?download=true`;
      link.setAttribute('download', `dispute_dossier_${promiseId}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDossierSuccess('Cryptographic Dispute Defense Dossier downloaded. Ready for PayPal Resolution Center.');
      setTimeout(() => setDossierSuccess(null), 5000);
    } finally {
      setDownloadingDossier(false);
    }
  };

  const loadPromise = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPromise(promiseId);
      setPromise(data);

      // Fetch evidence list
      const evData = await fetchPromiseEvidence(promiseId).catch(() => ({
        items: data.evidence || [],
      }));
      setEvidenceList(evData.items || []);

      // Fetch latest verification run if present
      if (data.verification?.latestRunId) {
        const vRun = await fetchVerificationRun(promiseId, data.verification.latestRunId).catch(
          () => null
        );
        setVerificationRun(vRun);
      }

      // Fetch resolution case if present
      if (data.resolution?.caseId) {
        const cData = await fetchResolutionCase(data.resolution.caseId).catch(() => null);
        setResolutionCase(cData);
      } else {
        const casesList = await listResolutionCases(promiseId).catch(() => null);
        if (casesList && casesList.items.length > 0) {
          setResolutionCase(casesList.items[0]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load promise');
    } finally {
      setLoading(false);
    }
  }, [promiseId]);

  useEffect(() => {
    if (promiseId) loadPromise();
  }, [promiseId, loadPromise]);

  // Real-Time Event Streaming SSE Client (Goal 4)
  useEffect(() => {
    if (!promiseId) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    let eventSource: EventSource | null = null;

    let connectedHandler: ((e: MessageEvent) => void) | null = null;
    let scanningHandler: ((e: MessageEvent) => void) | null = null;
    let ocrHandler: ((e: MessageEvent) => void) | null = null;
    let aiAnalyzingHandler: ((e: MessageEvent) => void) | null = null;
    let merkleHandler: ((e: MessageEvent) => void) | null = null;
    let paymentHandler: ((e: MessageEvent) => void) | null = null;
    let disputeSyncedHandler: ((e: MessageEvent) => void) | null = null;
    let disputeResolvedHandler: ((e: MessageEvent) => void) | null = null;

    try {
      eventSource = new EventSource(`${API_URL}/api/promises/${promiseId}/events`);

      eventSource.onopen = () => {
        setStreamConnected(true);
      };

      eventSource.onerror = () => {
        setStreamConnected(false);
      };

      const handleIncomingEvent = (eventType: string, displayTitle: string) => (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          const detailMsg =
            parsed.data?.summary ||
            parsed.data?.message ||
            parsed.message ||
            `Event: ${eventType.replace(/_/g, ' ')}`;

          setRealtimeEvents((prev) => [
            { type: eventType, message: detailMsg, timestamp: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9),
          ]);

          setLiveToast({ title: displayTitle, message: detailMsg });
          setTimeout(() => setLiveToast(null), 4500);

          if (
            ['MERKLE_TREE_SEALED', 'PAYMENT_CAPTURED', 'PAYPAL_DISPUTE_SYNCED', 'PAYPAL_DISPUTE_RESOLVED'].includes(
              eventType
            )
          ) {
            loadPromise();
          }
        } catch {}
      };

      connectedHandler = handleIncomingEvent('CONNECTED', 'Stream Connected');
      scanningHandler = handleIncomingEvent('EVIDENCE_SCANNING', 'Evidence Scanning');
      ocrHandler = handleIncomingEvent('OCR_EXTRACTING', 'Multimodal Vision OCR');
      aiAnalyzingHandler = handleIncomingEvent('AI_ANALYZING_REQUIREMENT', 'AI Requirement Analysis');
      merkleHandler = handleIncomingEvent('MERKLE_TREE_SEALED', 'Merkle Tree Sealed');
      paymentHandler = handleIncomingEvent('PAYMENT_CAPTURED', 'Payment Captured');
      disputeSyncedHandler = handleIncomingEvent('PAYPAL_DISPUTE_SYNCED', 'PayPal Dispute Synced');
      disputeResolvedHandler = handleIncomingEvent('PAYPAL_DISPUTE_RESOLVED', 'PayPal Dispute Resolved');

      eventSource.addEventListener('CONNECTED', connectedHandler);
      eventSource.addEventListener('EVIDENCE_SCANNING', scanningHandler);
      eventSource.addEventListener('OCR_EXTRACTING', ocrHandler);
      eventSource.addEventListener('AI_ANALYZING_REQUIREMENT', aiAnalyzingHandler);
      eventSource.addEventListener('MERKLE_TREE_SEALED', merkleHandler);
      eventSource.addEventListener('PAYMENT_CAPTURED', paymentHandler);
      eventSource.addEventListener('PAYPAL_DISPUTE_SYNCED', disputeSyncedHandler);
      eventSource.addEventListener('PAYPAL_DISPUTE_RESOLVED', disputeResolvedHandler);
    } catch {}

    return () => {
      if (eventSource) {
        if (connectedHandler) eventSource.removeEventListener('CONNECTED', connectedHandler);
        if (scanningHandler) eventSource.removeEventListener('EVIDENCE_SCANNING', scanningHandler);
        if (ocrHandler) eventSource.removeEventListener('OCR_EXTRACTING', ocrHandler);
        if (aiAnalyzingHandler) eventSource.removeEventListener('AI_ANALYZING_REQUIREMENT', aiAnalyzingHandler);
        if (merkleHandler) eventSource.removeEventListener('MERKLE_TREE_SEALED', merkleHandler);
        if (paymentHandler) eventSource.removeEventListener('PAYMENT_CAPTURED', paymentHandler);
        if (disputeSyncedHandler) eventSource.removeEventListener('PAYPAL_DISPUTE_SYNCED', disputeSyncedHandler);
        if (disputeResolvedHandler) eventSource.removeEventListener('PAYPAL_DISPUTE_RESOLVED', disputeResolvedHandler);
        eventSource.close();
      }
    };
  }, [promiseId, loadPromise]);

  const handleCreatePaymentOrder = async (): Promise<string> => {
    if (!promise) throw new Error('Promise is not loaded');
    setPaying(true);
    setError(null);
    try {
      const order = await createPaymentOrder(promise.promiseId);
      return order.paypalOrderId;
    } catch (err: unknown) {
      setPaying(false);
      const msg = err instanceof Error ? err.message : 'Failed to create PayPal payment order';
      setError(msg);
      throw err;
    }
  };

  const handleApprovePayment = async (orderId: string) => {
    if (!promise) return;
    setPaying(true);
    setError(null);
    try {
      const capture = await capturePaymentOrder(promise.promiseId, orderId);
      const isSim =
        capture.paypalCaptureId?.startsWith('MOCK_') ||
        capture.paypalOrderId?.startsWith('MOCK_');
      if (isSim) {
        setPaymentSuccessMessage(
          `Simulated Demo Mode: Payment simulated with mock IDs (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId}). No actual PayPal charge was processed.`
        );
      } else {
        setPaymentSuccessMessage(
          `PayPal payment captured (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
        );
      }
      await loadPromise();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PayPal payment capture failed');
    } finally {
      setPaying(false);
    }
  };

  const handleDirectSandboxPayment = async () => {
    if (!promise) return;
    setPaying(true);
    setError(null);
    try {
      const order = await createPaymentOrder(promise.promiseId);
      const capture = await capturePaymentOrder(promise.promiseId, order.paypalOrderId);
      setPaymentSuccessMessage(
        `Simulated Demo Mode: Simulated demo action executed — no PayPal payment was made (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
      );
      await loadPromise();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Simulated payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleRunVerification = async () => {
    if (!promise) return;
    setVerifying(true);
    setVerificationError(null);
    try {
      const run = await triggerVerification(promise.promiseId, { forceRerun: true });
      setVerificationRun(run);
      setVerificationSuccessMessage(
        `AI Verification completed! Outcome: ${run.outcome} (Confidence: ${Math.round(
          (run.overallConfidence || 0) * 100
        )}%)`
      );
      await loadPromise();
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Verification run failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRecordDecision = async (decision: ResolutionDecision, reason: string) => {
    if (!resolutionCase) return;
    setSubmittingDecision(true);
    setCaseError(null);
    try {
      const updated = await recordCaseDecision(resolutionCase.caseId, {
        decision,
        reason,
        reviewer: user?.email || 'lead.reviewer@promisepay.example',
      });
      setResolutionCase(updated);
      setCaseSuccessMessage(`Reviewer decision '${decision}' confirmed and persisted.`);
      await loadPromise();
    } catch (err: unknown) {
      setCaseError(err instanceof Error ? err.message : 'Failed to record decision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading && !promise) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0070BA] border-t-transparent" />
          <p className="text-xs font-bold text-slate-600">Loading Promise Graph...</p>
        </div>
      </div>
    );
  }

  if (error && !promise) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h3 className="text-base font-bold text-rose-800">Promise Not Found</h3>
        <p className="mt-1 text-xs text-rose-600">{error || `Could not find promise ${promiseId}`}</p>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-blue-600 hover:underline">
          &larr; Back to Promise Ledger
        </Link>
      </div>
    );
  }

  if (!promise) return null;

  const currentStepIdx = STATUS_STEPS.indexOf(promise.status);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Status Badges */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          &larr; Back to Promise Ledger
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded border">
            Version: v{promise.currentVersion}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              promise.status === 'PAID' || promise.status === 'EVIDENCE_SUBMITTED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            }`}
          >
            {promise.status}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {paymentSuccessMessage && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between shadow-xs ${
            paymentSuccessMessage.includes('Simulated Demo Mode')
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {paymentSuccessMessage.includes('Simulated Demo Mode') && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-400">
                Simulated Demo Mode
              </span>
            )}
            <span>{paymentSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPaymentSuccessMessage(null)}
            className="text-slate-500 hover:text-slate-800 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {verificationSuccessMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-medium text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">&#10004;</span>
            <span>{verificationSuccessMessage}</span>
          </div>
          <button
            onClick={() => setVerificationSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {verificationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">!</span>
            <span>{verificationError}</span>
          </div>
          <button
            onClick={() => setVerificationError(null)}
            className="text-rose-600 hover:text-rose-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {caseSuccessMessage && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-medium text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold">&#9888;</span>
            <span>{caseSuccessMessage}</span>
          </div>
          <button
            onClick={() => setCaseSuccessMessage(null)}
            className="text-amber-600 hover:text-amber-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {caseError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">!</span>
            <span>{caseError}</span>
          </div>
          <button
            onClick={() => setCaseError(null)}
            className="text-rose-600 hover:text-rose-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {refundSuccessMessage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">&#8635;</span>
            <span>{refundSuccessMessage}</span>
          </div>
          <button
            onClick={() => setRefundSuccessMessage(null)}
            className="text-rose-600 hover:text-rose-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {dossierSuccess && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-xs font-medium text-blue-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#0070BA] font-bold">🛡️</span>
            <span>{dossierSuccess}</span>
          </div>
          <button
            onClick={() => setDossierSuccess(null)}
            className="text-blue-600 hover:text-blue-900 ml-4 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Floating Real-Time Event Notification Toast (Goal 4) */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-xl ring-1 ring-black/5 max-w-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#0070BA]">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-900">{liveToast.title}</h4>
            <p className="mt-0.5 text-[11px] text-slate-600 truncate">{liveToast.message}</p>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Active PayPal Dispute Badge (Goal 5) */}
      {(promise.resolution?.status === 'DISPUTED' ||
        resolutionCase?.caseId?.startsWith('paypal_') ||
        promise.status === 'REVIEW_REQUIRED') && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-rose-900">
                  PayPal Resolution Center Dispute Case
                </span>
                <span className="font-mono text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                  {promise.resolution?.caseId || resolutionCase?.caseId || 'PP-DISPUTE-ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Dispute Reason: {promise.resolution?.reason || resolutionCase?.reason || 'Deliverable dispute open'}. Cryptographic Merkle dossier ready for PayPal defense.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDossierModal(true)}
              className="rounded-lg bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <span>🛡️</span>
              <span>View Defense Dossier</span>
            </button>
            <button
              onClick={handleDownloadDossier}
              disabled={downloadingDossier}
              className="rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 px-3 py-1.5 text-xs font-semibold shadow-xs transition whitespace-nowrap"
            >
              {downloadingDossier ? 'Generating...' : 'Download JSON'}
            </button>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold font-mono text-slate-900">{promise.promiseId}</h2>
              <span className="rounded bg-blue-50 text-[#0070BA] border border-blue-200 px-2 py-0.5 text-xs font-semibold capitalize">
                {promise.category.replace('_', ' ')}
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-slate-800">{promise.title}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left md:text-right">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">LOCKED AMOUNT</span>
              <p className="text-3xl font-extrabold text-[#003087]">
                ${promise.amount.value}{' '}
                <span className="text-sm font-normal text-slate-500">{promise.amount.currencyCode}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Elegant Progress Pipeline (Chevron Stepper) */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Elegant Progress Pipeline
          </p>
          <div className="flex items-center w-full overflow-x-auto py-1 text-[11px] font-bold">
            {STATUS_STEPS.map((s, idx) => {
              const isPast = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              const isFirst = idx === 0;
              const isLast = idx === STATUS_STEPS.length - 1;

              // Polygon clip-paths for crisp chevron arrow shapes
              let clipClass = '';
              if (isFirst) {
                clipClass = '[clip-path:polygon(0%_0%,calc(100%-12px)_0%,100%_50%,calc(100%-12px)_100%,0%_100%)]';
              } else if (isLast) {
                clipClass = '[clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%,12px_50%)]';
              } else {
                clipClass = '[clip-path:polygon(0%_0%,calc(100%-12px)_0%,100%_50%,calc(100%-12px)_100%,0%_100%,12px_50%)]';
              }

              return (
                <div
                  key={s}
                  className={`flex-1 min-w-[105px] py-2.5 px-3 text-center transition-all ${clipClass} ${
                    isCurrent
                      ? 'bg-[#0a1733] text-white shadow-sm font-extrabold'
                      : isPast
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span className="truncate">{s.replace(/_/g, ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start mt-6">
        {/* Left Area (9 cols): Top 2-col row + Bottom 3-col row */}
        <div className="xl:col-span-9 space-y-6">
          {/* Top Row: Live SSE Activity Stream + Bryntum Schedule Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Live Verification Activity Stream (SSE) Card */}
            <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Verification Activity Stream (SSE)
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      streamConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        streamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {streamConnected ? 'Connected on SSE / Redis' : 'Listening...'}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto">
                  {realtimeEvents.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-4 border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2.5">
                      <Activity className="h-4 w-4 text-[#0070BA] shrink-0" />
                      <span>Ready for agent verification events (EVIDENCE_SCANNING, OCR_EXTRACTING, MERKLE_TREE_SEALED)...</span>
                    </div>
                  ) : (
                    realtimeEvents.slice(0, 5).map((ev, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-50 p-2.5 text-xs border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-slate-800 text-[11px]">{ev.type}</span>
                          <span className="text-slate-600 text-[11px] truncate">{ev.message}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {ev.timestamp}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {realtimeEvents.length > 0 && (
                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-right">
                  Latest: {realtimeEvents[0].timestamp}
                </div>
              )}
            </div>

            {/* Promise Milestone Schedule Card */}
            <div className="md:col-span-7">
              <BryntumScheduleCard promise={promise} />
            </div>
          </div>

          {/* Bottom Row: 3 Equal Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <AtomicRequirementsCard
              requirements={promise.requirements}
              evidenceList={evidenceList}
            />

            <EvidenceVaultCard
              evidenceList={evidenceList}
              onAddEvidence={() => setShowEvidenceModal(true)}
            />

            <VerificationReportCard
              verificationRun={verificationRun}
              onTriggerVerification={handleRunVerification}
              verifying={verifying}
            />
          </div>

          {/* Human Resolution Card (full width if needed) */}
          <HumanResolutionCard
            resolutionCase={resolutionCase}
            onOpenCase={() => setShowOpenCaseModal(true)}
            onRecordDecision={handleRecordDecision}
            onExecuteRefund={() => setShowRefundModal(true)}
            submittingDecision={submittingDecision}
          />
        </div>

        {/* Right Sticky Area (3 cols) */}
        <div className="xl:col-span-3 space-y-6 xl:sticky xl:top-20">
          <button
            onClick={() => setShowDossierModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 text-xs font-bold shadow-xs transition"
            title="View and print official cryptographic dossier for PayPal Resolution Center"
          >
            <span>🛡️</span>
            <span>View Dispute Dossier</span>
          </button>

          <PaymentEscrowCard
            promise={promise}
            onCreateOrder={handleCreatePaymentOrder}
            onApprove={handleApprovePayment}
            onError={(msg) => setError(msg)}
            onCancel={() => setError('PayPal checkout was cancelled by the buyer.')}
            paying={paying}
            onAddEvidence={() => setShowEvidenceModal(true)}
            onDirectPaySandbox={
              process.env.NEXT_PUBLIC_PAYPAL_DEMO_MODE === 'true'
                ? handleDirectSandboxPayment
                : undefined
            }
            onOpenCancelModal={() => setShowCancelModal(true)}
          />

          <PaymentProofCard
            payment={promise.payment}
            promiseId={promise.promiseId}
            timeline={promise.timeline}
          />

          <AuditTimelineCard timeline={promise.timeline} />
        </div>
      </div>

      {/* Accessible Modals */}
      <SubmitEvidenceModal
        isOpen={showEvidenceModal}
        onClose={() => setShowEvidenceModal(false)}
        promise={promise}
        onSuccess={loadPromise}
      />

      <OpenCaseModal
        isOpen={showOpenCaseModal}
        onClose={() => setShowOpenCaseModal(false)}
        promiseId={promise.promiseId}
        onSuccess={async (createdCase) => {
          setResolutionCase(createdCase);
          setCaseSuccessMessage(`Resolution Case ${createdCase.caseId} opened successfully.`);
          await loadPromise();
        }}
      />

      {resolutionCase && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          resolutionCase={resolutionCase}
          promise={promise}
          onSuccess={async (result) => {
            setRefundSuccessMessage(
              `PayPal Sandbox Refund Successful! Transaction ID: ${result.paypalRefundId} ($${result.amount} ${result.currency})`
            );
            await loadPromise();
          }}
        />
      )}

      {promise && (
        <DisputeDossierModal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          promiseId={promise.promiseId}
        />
      )}

      {promise && (
        <CancelRefundModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          promise={promise}
          onSuccess={async (result) => {
            if (result.refundExecuted) {
              setRefundSuccessMessage(
                `Agreement Cancelled & Fully Refunded via PayPal! Refund ID: ${result.paypalRefundId} ($${result.amount} ${result.currency})`
              );
            } else {
              setRefundSuccessMessage(
                `Agreement Cancelled successfully before payment execution.`
              );
            }
            await loadPromise();
          }}
        />
      )}
    </div>
  );
}
