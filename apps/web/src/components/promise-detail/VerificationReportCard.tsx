'use client';

import React, { useState } from 'react';
import { VerificationRun } from '@/types/promise';

interface VerificationReportCardProps {
  verificationRun: VerificationRun | null;
  onTriggerVerification: () => Promise<void>;
  verifying: boolean;
}

export function VerificationReportCard({
  verificationRun,
  onTriggerVerification,
  verifying,
}: VerificationReportCardProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
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
            {verificationRun.outcome ? (
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
            ) : (
              <span className="rounded-lg px-2.5 py-1 text-xs font-bold border bg-blue-50 text-[#0070BA] border-blue-200 animate-pulse">
                Analyzing...
              </span>
            )}
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
            onClick={onTriggerVerification}
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
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Run ID</span>
              <span className="font-mono text-slate-800 font-semibold truncate block" title={verificationRun.runId}>
                {verificationRun.runId}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Model & Engine</span>
              <span className="font-semibold text-slate-800 truncate block" title={verificationRun.modelIdentifier}>
                {verificationRun.modelIdentifier}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Prompt Version</span>
              <span className="font-mono text-slate-800 truncate block">{verificationRun.promptVersion}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Manifest Hash</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-slate-700">
                  {verificationRun.evidenceManifestHash.substring(0, 10)}...
                </span>
                <button
                  onClick={() => copyToClipboard(verificationRun.evidenceManifestHash)}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                >
                  {copiedHash === verificationRun.evidenceManifestHash ? 'Copied!' : 'Copy'}
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
  );
}

