'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  EvidenceItem,
  EvidenceKind,
  PromiseGraphResponse,
  PromiseStatus,
  VerificationRun,
} from '@/types/promise';
import {
  capturePaymentOrder,
  createPaymentOrder,
  fetchPromise,
  fetchPromiseEvidence,
  fetchVerificationRun,
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
              ${promise.amount.value}{' '}
              <span className="text-sm font-normal text-slate-500">{promise.amount.currencyCode}</span>
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Verifiable Evidence Vault</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically fingerprinted proof items linked to requirements.
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
    </div>
  );
}
