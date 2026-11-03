'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import { AtomicRequirementsCard } from '@/components/promise-detail/AtomicRequirementsCard';
import { EvidenceVaultCard } from '@/components/promise-detail/EvidenceVaultCard';
import { VerificationReportCard } from '@/components/promise-detail/VerificationReportCard';
import { HumanResolutionCard } from '@/components/promise-detail/HumanResolutionCard';
import { PaymentEscrowCard } from '@/components/promise-detail/PaymentEscrowCard';
import { AuditTimelineCard } from '@/components/promise-detail/AuditTimelineCard';

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

  // Modal States
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showOpenCaseModal, setShowOpenCaseModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

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

  const loadPromise = async () => {
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
  };

  useEffect(() => {
    if (promiseId) loadPromise();
  }, [promiseId]);

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
      setPaymentSuccessMessage(
        `Payment successful! Approved & Captured via PayPal Sandbox (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
      );
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
        `Direct payment successful! Captured via PayPal Sandbox (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
      );
      await loadPromise();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment process failed');
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
        reviewer: 'lead.reviewer@promisepay.example',
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between shadow-xs">
          <span>{paymentSuccessMessage}</span>
          <button
            onClick={() => setPaymentSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 ml-4 font-bold text-sm"
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-left md:text-right">
            <button
              onClick={handleDownloadDossier}
              disabled={downloadingDossier}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0070BA] hover:bg-blue-100 transition-colors shadow-2xs"
              title="Download cryptographic package ready for PayPal Resolution Center"
            >
              <span>🛡️</span>
              <span>{downloadingDossier ? 'Generating...' : 'Export Dispute Dossier'}</span>
            </button>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Locked Amount</span>
              <p className="text-3xl font-extrabold text-[#003087]">
                ${promise.amount.value}{' '}
                <span className="text-sm font-normal text-slate-500">{promise.amount.currencyCode}</span>
              </p>
            </div>
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

      {/* Grid: Requirements, Evidence, Reports, and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
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

          <HumanResolutionCard
            resolutionCase={resolutionCase}
            onOpenCase={() => setShowOpenCaseModal(true)}
            onRecordDecision={handleRecordDecision}
            onExecuteRefund={() => setShowRefundModal(true)}
            submittingDecision={submittingDecision}
          />
        </div>

        {/* Right 1 Col */}
        <div className="space-y-6">
          <PaymentEscrowCard
            promise={promise}
            onCreateOrder={handleCreatePaymentOrder}
            onApprove={handleApprovePayment}
            onError={(msg) => setError(msg)}
            onCancel={() => setError('PayPal checkout was cancelled by the buyer.')}
            paying={paying}
            onAddEvidence={() => setShowEvidenceModal(true)}
            onDirectPaySandbox={handleDirectSandboxPayment}
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
    </div>
  );
}
