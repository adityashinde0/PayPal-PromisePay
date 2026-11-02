'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  EvidenceItem,
  EvidenceKind,
  PromiseGraphResponse,
  PromiseStatus,
  ResolutionCase,
  ResolutionDecision,
  VerificationRun,
} from '@/types/promise';
import {
  capturePaymentOrder,
  createPaymentOrder,
  executeCaseRefund,
  fetchPromise,
  fetchPromiseEvidence,
  fetchResolutionCase,
  fetchVerificationRun,
  listResolutionCases,
  openResolutionCase,
  recordCaseDecision,
  submitEvidence,
  triggerVerification,
  uploadEvidenceFile,
} from '@/lib/api';

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
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [evidenceSuccessMessage, setEvidenceSuccessMessage] = useState<string | null>(null);
  const [verificationSuccessMessage, setVerificationSuccessMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolution & Refund State (Phase 5)
  const [resolutionCase, setResolutionCase] = useState<ResolutionCase | null>(null);
  const [showOpenCaseModal, setShowOpenCaseModal] = useState(false);
  const [caseReason, setCaseReason] = useState('');
  const [caseOutcomeRequested, setCaseOutcomeRequested] = useState('REVIEW');
  const [submittingCase, setSubmittingCase] = useState(false);
  const [caseSuccessMessage, setCaseSuccessMessage] = useState<string | null>(null);
  const [caseError, setCaseError] = useState<string | null>(null);

  // Reviewer Decision & Refund modal state
  const [selectedDecision, setSelectedDecision] = useState<ResolutionDecision>('RECOMMEND_REFUND');
  const [decisionReason, setDecisionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('Full outcome refund authorized by reviewer.');
  const [executingRefund, setExecutingRefund] = useState(false);
  const [refundSuccessMessage, setRefundSuccessMessage] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Evidence Form State
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('live_url');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');
  const [submitterClaim, setSubmitterClaim] = useState('');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  // Dispute Defense Dossier State (Strategic Improvement 1)
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
      const evData = await fetchPromiseEvidence(promiseId).catch(() => ({ items: data.evidence || [] }));
      setEvidenceList(evData.items || []);

      // Fetch latest verification run if present
      if (data.verification?.latestRunId) {
        const vRun = await fetchVerificationRun(promiseId, data.verification.latestRunId).catch(() => null);
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

  const handleSandboxPayment = async () => {
    if (!promise) return;
    setPaying(true);
    setError(null);
    try {
      const order = await createPaymentOrder(promise.promiseId);
      const capture = await capturePaymentOrder(promise.promiseId, order.paypalOrderId);
      setPaymentSuccessMessage(
        `Payment successful! Captured via PayPal Sandbox (Order: ${capture.paypalOrderId}, Capture: ${capture.paypalCaptureId})`
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
        `AI Verification completed! Outcome: ${run.outcome} (Confidence: ${Math.round((run.overallConfidence || 0) * 100)}%)`
      );
      await loadPromise();
    } catch (err: unknown) {
      setVerificationError(err instanceof Error ? err.message : 'Verification run failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promise) return;
    if (!caseReason.trim() || caseReason.trim().length < 5) {
      setCaseError('Please provide a substantive review reason (min 5 characters).');
      return;
    }
    setSubmittingCase(true);
    setCaseError(null);
    try {
      const createdCase = await openResolutionCase(promise.promiseId, {
        reason: caseReason.trim(),
        requestedOutcome: caseOutcomeRequested,
        submitter: 'buyer@example.com',
        role: 'BUYER',
      });
      setResolutionCase(createdCase);
      setCaseSuccessMessage(`Resolution Case ${createdCase.caseId} opened successfully. Status transitioned to REVIEW_REQUIRED.`);
      setShowOpenCaseModal(false);
      setCaseReason('');
      await loadPromise();
    } catch (err: unknown) {
      setCaseError(err instanceof Error ? err.message : 'Failed to open resolution case');
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionCase) return;
    if (!decisionReason.trim() || decisionReason.trim().length < 5) {
      setCaseError('Mandatory human reviewer justification reason is required (min 5 characters).');
      return;
    }
    setSubmittingDecision(true);
    setCaseError(null);
    try {
      const updated = await recordCaseDecision(resolutionCase.caseId, {
        decision: selectedDecision,
        reason: decisionReason.trim(),
        reviewer: 'lead.reviewer@promisepay.example',
      });
      setResolutionCase(updated);
      setCaseSuccessMessage(`Reviewer decision '${selectedDecision}' confirmed and persisted.`);
      setDecisionReason('');
      await loadPromise();
    } catch (err: unknown) {
      setCaseError(err instanceof Error ? err.message : 'Failed to record decision');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleExecuteRefund = async () => {
    if (!resolutionCase || !promise) return;
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
      setRefundSuccessMessage(
        `PayPal Sandbox Refund Successful! Transaction ID: ${result.paypalRefundId} ($${result.amount} ${result.currency})`
      );
      setShowRefundModal(false);
      await loadPromise();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Failed to execute PayPal refund');
    } finally {
      setExecutingRefund(false);
    }
  };

  const handleToggleRequirement = (reqId: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promise) return;
    if (selectedReqIds.length === 0) {
      setEvidenceError('Please select at least one requirement that this evidence supports.');
      return;
    }
    if (!submitterClaim.trim()) {
      setEvidenceError('Please state what this evidence proves.');
      return;
    }

    setSubmittingEvidence(true);
    setEvidenceError(null);

    try {
      if (evidenceKind === 'document' || evidenceKind === 'screenshot') {
        if (!selectedFile && !evidenceSource.trim()) {
          throw new Error('Please select a file to upload or enter a URL.');
        }

        if (selectedFile) {
          await uploadEvidenceFile(
            promise.promiseId,
            selectedFile,
            selectedReqIds,
            submitterClaim,
            evidenceTitle || selectedFile.name
          );
        } else {
          await submitEvidence(promise.promiseId, {
            kind: evidenceKind,
            title: evidenceTitle || undefined,
            source: evidenceSource.trim(),
            requirementIds: selectedReqIds,
            submitterClaim: submitterClaim.trim(),
          });
        }
      } else {
        if (!evidenceSource.trim()) {
          throw new Error('Source URL or tracking reference is required.');
        }
        await submitEvidence(promise.promiseId, {
          kind: evidenceKind,
          title: evidenceTitle || undefined,
          source: evidenceSource.trim(),
          requirementIds: selectedReqIds,
          submitterClaim: submitterClaim.trim(),
        });
      }

      setEvidenceSuccessMessage('Evidence registered successfully with cryptographic provenance and SSRF verification!');
      setShowEvidenceModal(false);
      // Reset form
      setEvidenceTitle('');
      setEvidenceSource('');
      setSubmitterClaim('');
      setSelectedReqIds([]);
      setSelectedFile(null);
      await loadPromise();
    } catch (err: unknown) {
      setEvidenceError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(text);
    setTimeout(() => setCopiedSha(null), 2000);
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Status Badges */}
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

      {evidenceSuccessMessage && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-medium text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-bold">&#10003;</span>
            <span>{evidenceSuccessMessage}</span>
          </div>
          <button
            onClick={() => setEvidenceSuccessMessage(null)}
            className="text-xs text-indigo-600 hover:text-indigo-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {verificationSuccessMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">&#10004;</span>
            <span>{verificationSuccessMessage}</span>
          </div>
          <button
            onClick={() => setVerificationSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {verificationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">!</span>
            <span>{verificationError}</span>
          </div>
          <button
            onClick={() => setVerificationError(null)}
            className="text-xs text-rose-600 hover:text-rose-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {caseSuccessMessage && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold">&#9888;</span>
            <span>{caseSuccessMessage}</span>
          </div>
          <button
            onClick={() => setCaseSuccessMessage(null)}
            className="text-xs text-amber-600 hover:text-amber-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {caseError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">!</span>
            <span>{caseError}</span>
          </div>
          <button
            onClick={() => setCaseError(null)}
            className="text-xs text-rose-600 hover:text-rose-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {refundSuccessMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold">&#10004;</span>
            <span>{refundSuccessMessage}</span>
          </div>
          <button
            onClick={() => setRefundSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {refundError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-rose-600 font-bold">!</span>
            <span>{refundError}</span>
          </div>
          <button
            onClick={() => setRefundError(null)}
            className="text-xs text-rose-600 hover:text-rose-900 ml-4 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {dossierSuccess && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm font-medium text-blue-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#0070BA] font-bold">🛡️</span>
            <span>{dossierSuccess}</span>
          </div>
          <button
            onClick={() => setDossierSuccess(null)}
            className="text-xs text-blue-600 hover:text-blue-900 ml-4 font-bold"
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
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0070BA] hover:bg-blue-100 transition-colors shadow-sm"
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

      {/* Grid: Requirements and Payment State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Atomic Requirements & Evidence Vault */}
        <div className="lg:col-span-2 space-y-6">
          {/* Atomic Requirements */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Atomic Requirements</h3>
              <span className="text-xs text-slate-500">
                {promise.requirements.length} checkpoint{promise.requirements.length === 1 ? '' : 's'} defined
              </span>
            </div>

            <div className="space-y-3">
              {promise.requirements.map((req, idx) => {
                const reqKey = req.id || req.key;
                const hasEvidence = evidenceList.some((e) => e.requirementIds.includes(reqKey) || e.requirementIds.includes(req.key));
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {req.key}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{req.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasEvidence && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Evidence Linked
                          </span>
                        )}
                        <span className="text-[11px] font-mono rounded bg-slate-50 px-2 py-0.5 text-slate-500 border">
                          {req.verificationMethod}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase 3: Evidence Vault */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Verifiable Evidence Vault</h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Rust Engine (promisepay-verify)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically fingerprinted proof items sealed via deterministic SHA-256 Merkle root.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEvidenceModal(true);
                  setEvidenceError(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
              >
                <span>+ Submit Evidence</span>
              </button>
            </div>

            {/* Evidence List */}
            {evidenceList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50">
                <p className="text-xs text-slate-500">No evidence submitted yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Once payment is captured, the seller uploads artifacts or URLs to support completion.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {evidenceList.map((item) => (
                  <div
                    key={item.evidenceId}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                          {item.kind.replace('_', ' ')}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-medium border border-emerald-200">
                          {item.provenance.scannerStatus}
                        </span>
                        {item.downloadUrl && (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                          >
                            Open / View &rarr;
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Submitter Claim Notice */}
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[11px] text-amber-800 uppercase tracking-wider">
                        <span>Declared by Seller (Claim Only)</span>
                        <span className="text-[10px] font-normal lowercase">not verified fact</span>
                      </div>
                      <p className="italic">{item.submitterClaim}</p>
                    </div>

                    {/* Provenance Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-600">Source:</span>{' '}
                        <span className="font-mono text-slate-700 truncate inline-block max-w-[200px] align-bottom">
                          {item.canonicalUri || item.sourceUri || 'Uploaded File'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-600">SHA-256:</span>
                        <span className="font-mono text-[10px] text-slate-700">
                          {item.sha256.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.sha256)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 ml-1 font-semibold"
                        >
                          {copiedSha === item.sha256 ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Submitted:</span>{' '}
                        <span>{new Date(item.provenance.receivedAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Supports:</span>{' '}
                        <span className="font-mono text-slate-700">{item.requirementIds.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 4: AI Outcome Verification Dossier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Explainable AI Verification Dossier</h3>
                  <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    Phase 4
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-source requirement validation citing cryptographic evidence IDs and provenance integrity.
                </p>
              </div>

              {verificationRun && (
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                      verificationRun.outcome === 'COMPLETE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : verificationRun.outcome === 'REVIEW_REQUIRED'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    Outcome: {verificationRun.outcome}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono font-bold text-slate-700">
                    {Math.round((verificationRun.overallConfidence || 0) * 100)}% Conf.
                  </span>
                </div>
              )}
            </div>

            {!verificationRun ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50 space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  &#9654;
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Verification Run Pending</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    Evidence is queued in the vault. Run the AI Verification Engine to freeze the evidence manifest, check SSRF guards, and perform deterministic requirement verification.
                  </p>
                </div>
                <button
                  onClick={handleRunVerification}
                  disabled={verifying}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {verifying ? 'Analyzing Requirements...' : 'Run AI Verification Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Manifest & Model Metadata Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Run ID</span>
                    <span className="font-mono text-slate-800 font-semibold">{verificationRun.runId}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Model & Engine</span>
                    <span className="font-semibold text-slate-800">{verificationRun.modelIdentifier}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Prompt Version</span>
                    <span className="font-mono text-slate-800">{verificationRun.promptVersion}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Manifest Hash</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-slate-700">
                        {verificationRun.evidenceManifestHash.substring(0, 10)}...
                      </span>
                      <button
                        onClick={() => copyToClipboard(verificationRun.evidenceManifestHash)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Outcome Policy Alert */}
                {verificationRun.outcome === 'REVIEW_REQUIRED' && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <span>&#9888; Human Review Required</span>
                    </div>
                    <p>
                      One or more critical requirements have partial support, uncorroborated submitter claims, or security boundary alerts. Under PromisePay deterministic policy, automated settlement is held for human confirmation.
                    </p>
                  </div>
                )}

                {verificationRun.outcome === 'COMPLETE' && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <span>&#10004; All Requirements Satisfied</span>
                    </div>
                    <p>
                      Every atomic requirement is corroborated by verified technical evidence, clean scans, and high confidence support.
                    </p>
                  </div>
                )}

                {/* Per-Requirement Findings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Requirement-by-Requirement Audit Breakdown ({verificationRun.results.length})
                  </h4>

                  {verificationRun.results.map((finding) => (
                    <div
                      key={finding.requirementId}
                      className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {finding.requirementKey || finding.requirementId}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              finding.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : finding.status === 'PARTIALLY_VERIFIED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : finding.status === 'HUMAN_REVIEW_REQUIRED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {finding.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">Confidence:</span>
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                finding.confidence >= 0.85
                                  ? 'bg-emerald-500'
                                  : finding.confidence >= 0.60
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.round(finding.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {Math.round(finding.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {finding.reasoning}
                      </p>

                      {/* Cited Evidence IDs */}
                      {finding.evidenceIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Cited Proof:</span>
                          {finding.evidenceIds.map((eid) => (
                            <span
                              key={eid}
                              className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium"
                            >
                              {eid}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Gaps / Missing Information */}
                      {finding.missingInformation.length > 0 && (
                        <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-2.5 text-xs text-rose-800 space-y-1">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-rose-700">
                            Evidence Gaps / Missing Elements:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                            {finding.missingInformation.map((gap, i) => (
                              <li key={i}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Stated Limitations */}
                      {finding.limitations.length > 0 && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-500 space-y-0.5">
                          <span className="font-semibold text-[10px] uppercase text-slate-400">Verification Boundary:</span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {finding.limitations.map((lim, i) => (
                              <li key={i}>{lim}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phase 5: Human Review & Resolution Center */}
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
              ) : (
                <button
                  onClick={() => {
                    setShowOpenCaseModal(true);
                    setCaseError(null);
                  }}
                  className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition"
                >
                  + Open Review Case
                </button>
              )}
            </div>

            {!resolutionCase ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700">No Active Dispute or Review Case</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  If automated verification flags gaps or a party disputes the deliverables, open a resolution case. Authorized human reviewers can adjudicate outcomes or initiate refunds.
                </p>
                <button
                  onClick={() => {
                    setShowOpenCaseModal(true);
                    setCaseError(null);
                  }}
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
                        <button
                          onClick={() => {
                            setShowRefundModal(true);
                            setRefundError(null);
                          }}
                          className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition whitespace-nowrap"
                        >
                          Execute PayPal Refund &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviewer Adjudication Form (shown if case not resolved) */}
                {resolutionCase.status !== 'RESOLVED_REFUNDED' && resolutionCase.status !== 'RESOLVED_COMPLETE' && (
                  <form onSubmit={handleRecordDecision} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
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

                    <button
                      type="submit"
                      disabled={submittingDecision}
                      className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {submittingDecision ? 'Persisting Decision...' : 'Confirm Reviewer Decision'}
                    </button>
                  </form>
                )}

                {/* Case Event Timeline */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Resolution Timeline Audit ({resolutionCase.timeline.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {resolutionCase.timeline.map((evt, idx) => (
                      <div key={idx} className="border-l-2 border-indigo-400 pl-3 py-0.5 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-700">{evt.actor}</span>
                          <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-medium text-slate-900">{evt.action}</p>
                        <p className="text-slate-600 text-[11px]">{evt.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Payment State & Audit Trail */}
        <div className="space-y-6">
          {/* Payment Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900">PayPal Payment Linkage</h4>
            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Payment State:</span>
                <span
                  className={`font-semibold ${
                    promise.payment.state === 'CAPTURED' ? 'text-emerald-700' : 'text-slate-800'
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

            {(promise.payment.state === 'CAPTURED' || promise.status === 'PAID' || promise.status === 'EVIDENCE_SUBMITTED') && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800">
                  Payment confirmed! Fulfillment and proof verification are active.
                </div>
                <button
                  onClick={() => {
                    setShowEvidenceModal(true);
                    setEvidenceError(null);
                  }}
                  className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white py-2 text-xs font-bold shadow transition"
                >
                  + Add More Evidence
                </button>
              </div>
            )}
          </div>

          {/* Phase 4: Verification Trigger Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">AI Verification Control</h4>
              <span className="text-[10px] font-mono rounded bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-200 font-semibold">
                Phase 4 Engine
              </span>
            </div>

            <div className="text-xs space-y-2.5 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Analysis Status:</span>
                <span className="font-semibold text-slate-800">
                  {verificationRun ? verificationRun.state : promise.verification.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Audit Outcome:</span>
                <span
                  className={`font-semibold ${
                    (verificationRun?.outcome || promise.verification.outcome) === 'COMPLETE'
                      ? 'text-emerald-700'
                      : (verificationRun?.outcome || promise.verification.outcome) === 'REVIEW_REQUIRED'
                      ? 'text-amber-700'
                      : 'text-slate-700'
                  }`}
                >
                  {verificationRun?.outcome || promise.verification.outcome || 'NOT RUN'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Confidence Band:</span>
                <span className="font-semibold text-slate-800">
                  {(verificationRun?.overallConfidence ?? promise.verification.confidence) !== null &&
                  (verificationRun?.overallConfidence ?? promise.verification.confidence) !== undefined
                    ? `${Math.round(((verificationRun?.overallConfidence ?? promise.verification.confidence) || 0) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleRunVerification}
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 text-xs font-bold shadow transition-colors disabled:opacity-50"
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Running AI Verification...
                  </span>
                ) : verificationRun ? (
                  '&#8635; Re-run AI Verification'
                ) : (
                  '&#9654; Run AI Verification'
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Freezes evidence manifest and evaluates atomic requirements with explainability.
              </p>
            </div>
          </div>

          {/* Phase 5: Resolution & Refund Control */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Resolution & Settlement</h4>
              <span className="text-[10px] font-mono rounded bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-200 font-semibold">
                Phase 5
              </span>
            </div>

            <div className="text-xs space-y-2.5 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Case ID:</span>
                <span className="font-mono text-slate-800 text-[11px]">
                  {resolutionCase ? resolutionCase.caseId : promise.resolution.caseId || 'None'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Case Status:</span>
                <span
                  className={`font-semibold ${
                    (resolutionCase?.status || promise.resolution.status) === 'RESOLVED_REFUNDED'
                      ? 'text-rose-700'
                      : (resolutionCase?.status || promise.resolution.status) === 'RESOLVED_COMPLETE'
                      ? 'text-emerald-700'
                      : 'text-slate-800'
                  }`}
                >
                  {resolutionCase ? resolutionCase.status : promise.resolution.status || 'NO CASE'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Decision:</span>
                <span className="font-semibold text-slate-800">
                  {resolutionCase?.decision || promise.resolution.decision || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {resolutionCase?.decision === 'RECOMMEND_REFUND' && resolutionCase.status !== 'RESOLVED_REFUNDED' ? (
                <button
                  onClick={() => {
                    setShowRefundModal(true);
                    setRefundError(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-2 text-xs font-bold shadow transition"
                >
                  <span>&#8635; Execute Sandbox Refund</span>
                </button>
              ) : !resolutionCase ? (
                <button
                  onClick={() => {
                    setShowOpenCaseModal(true);
                    setCaseError(null);
                  }}
                  className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold border transition"
                >
                  Open Review Case
                </button>
              ) : null}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Audit Trail</h4>
            <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
              {promise.timeline.map((event, idx) => (
                <div key={idx} className="border-l-2 border-blue-500 pl-3 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">{event.actor}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="font-medium text-slate-800">{event.eventType}</p>
                  <p className="text-slate-500 text-[11px]">{event.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Submit Evidence */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Submit Verifiable Evidence</h3>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitEvidence} className="mt-4 space-y-4">
              {evidenceError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {evidenceError}
                </div>
              )}

              {/* Kind Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Evidence Kind
                </label>
                <select
                  value={evidenceKind}
                  onChange={(e) => setEvidenceKind(e.target.value as EvidenceKind)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="live_url">Live Deployment URL (Website, App)</option>
                  <option value="repository">Git Repository (GitHub, GitLab)</option>
                  <option value="screenshot">Screenshot / Image Evidence</option>
                  <option value="document">Document / PDF Report</option>
                  <option value="tracking_reference">Carrier Tracking Reference</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Title / Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Production URL or Delivery Receipt"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Source or File Picker */}
              {(evidenceKind === 'document' || evidenceKind === 'screenshot') ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Upload File or Reference URL
                  </label>
                  <input
                    type="file"
                    accept={evidenceKind === 'screenshot' ? 'image/*' : '.pdf,.txt,.json,.md,.zip'}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-[11px] text-slate-400">Or specify an external URL:</p>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={evidenceSource}
                    onChange={(e) => setEvidenceSource(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {evidenceKind === 'tracking_reference' ? 'Tracking Number / Reference' : 'Verified URL'}
                  </label>
                  <input
                    type={evidenceKind === 'tracking_reference' ? 'text' : 'url'}
                    placeholder={
                      evidenceKind === 'tracking_reference'
                        ? 'e.g. 9400111899562537624128'
                        : 'https://...'
                    }
                    value={evidenceSource}
                    onChange={(e) => setEvidenceSource(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Requirement Checkboxes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Which requirements does this evidence prove?
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {promise.requirements.map((req) => {
                    const reqKey = req.id || req.key;
                    const checked = selectedReqIds.includes(reqKey);
                    return (
                      <label key={reqKey} className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleRequirement(reqKey)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          <span className="font-mono font-bold text-slate-700">{req.key}:</span> {req.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submitter Claim Statement */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Submitter Statement / Claim
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain exactly what this artifact demonstrates (e.g. 'Live deployment features responsive grid on mobile and passes catalog queries.')..."
                  value={submitterClaim}
                  onChange={(e) => setSubmitterClaim(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Security note: Submissions are tagged as subjective claims until automated analysis and human reviewer inspect the provenance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvidence}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {submittingEvidence ? 'Registering with SSRF Guard...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Resolution Case */}
      {showOpenCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Open Formal Review / Dispute Case</h3>
              <button
                onClick={() => setShowOpenCaseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleOpenCase} className="mt-4 space-y-4">
              {caseError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {caseError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Requested Outcome
                </label>
                <select
                  value={caseOutcomeRequested}
                  onChange={(e) => setCaseOutcomeRequested(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="REVIEW">Independent Technical Review (Settle or Clarify)</option>
                  <option value="REFUND">Full / Partial Refund (Non-fulfillment)</option>
                  <option value="FULFILLMENT_RECHECK">Supplementary Artifact Submission</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Dispute Reason & Gaps Description *
                </label>
                <textarea
                  rows={4}
                  value={caseReason}
                  onChange={(e) => setCaseReason(e.target.value)}
                  placeholder="Detail why human review is required, citing which requirement outcomes or evidence artifacts are contested..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOpenCaseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCase}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {submittingCase ? 'Opening Case...' : 'Open Review Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm PayPal Sandbox Refund */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-rose-600 font-extrabold text-base">&#9888;</span>
                <h3 className="text-lg font-bold text-slate-900">Authorize PayPal Sandbox Refund</h3>
              </div>
              <button
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {refundError && (
                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
                  {refundError}
                </div>
              )}

              <div className="rounded-xl bg-rose-50/60 border border-rose-200 p-4 space-y-2">
                <div className="flex justify-between border-b border-rose-200/60 pb-1.5">
                  <span className="text-slate-500">Case ID:</span>
                  <span className="font-mono font-bold text-slate-800">{resolutionCase?.caseId}</span>
                </div>
                <div className="flex justify-between border-b border-rose-200/60 pb-1.5">
                  <span className="text-slate-500">PayPal Capture ID:</span>
                  <span className="font-mono text-slate-800">{promise.payment.paypalCaptureId || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Refund Amount:</span>
                  <span className="font-bold text-rose-700 text-sm">
                    ${promise.amount.value} {promise.amount.currencyCode}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Note to Payer / Settlement Justification
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 block">Governance & Idempotency Safeguards:</span>
                <p>
                  This will call PayPal REST Payments v2 (`/v2/payments/captures/{'{id}'}/refund`). Operation is protected by an ephemeral UUID `Idempotency-Key` preventing duplicate payouts.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteRefund}
                  disabled={executingRefund}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {executingRefund ? 'Processing PayPal Refund...' : 'Confirm & Move Funds'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
