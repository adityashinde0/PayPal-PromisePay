'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Download,
  Printer,
  X,
  FileCheck,
  Lock,
  ExternalLink,
  Hash,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface DisputeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  promiseId: string;
}

export function DisputeDossierModal({
  isOpen,
  onClose,
  promiseId,
}: DisputeDossierModalProps) {
  const [dossier, setDossier] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedRoot, setCopiedRoot] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${API_URL}/api/promises/${promiseId}/dispute-defense-dossier?download=false`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          setDossier(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, promiseId, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const link = document.createElement('a');
    link.href = `${API_URL}/api/promises/${promiseId}/dispute-defense-dossier?download=true`;
    link.setAttribute('download', `dispute_dossier_${promiseId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMerkleRoot = () => {
    if (!dossier?.cryptographicProof?.merkle_root) return;
    navigator.clipboard.writeText(dossier.cryptographicProof.merkle_root);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#003087] to-[#0070BA] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  PayPal Dispute Defense Dossier
                </h3>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                  RFC 6962 Sealed
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Official cryptographic outcome defense for PayPal Resolution Center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0070BA] border-t-transparent" />
              <p className="text-xs font-semibold text-slate-500">
                Compiling cryptographic Merkle tree and audit trail...
              </p>
            </div>
          ) : !dossier ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Unable to load dossier. Please ensure the API is reachable.
            </div>
          ) : (
            <>
              {/* Compliance Statement Banner */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <FileCheck className="h-4 w-4 text-[#0070BA]" />
                  <span>Seller Protection Admissibility Statement</span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900/90">
                  {dossier.complianceStatement}
                </p>
              </div>

              {/* Core Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Promise ID
                  </span>
                  <p className="font-mono font-bold text-slate-800 truncate mt-0.5">
                    {dossier.promiseId}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    PayPal Order ID
                  </span>
                  <p className="font-mono font-bold text-slate-800 truncate mt-0.5">
                    {dossier.paypalTransaction?.orderId || 'PENDING'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    PayPal Capture ID
                  </span>
                  <p className="font-mono font-bold text-slate-800 truncate mt-0.5">
                    {dossier.paypalTransaction?.captureId || 'N/A'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Transaction Value
                  </span>
                  <p className="font-bold text-[#003087] mt-0.5">
                    ${dossier.paypalTransaction?.amount?.value || '0.00'}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">
                      {dossier.paypalTransaction?.amount?.currencyCode || 'USD'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Cryptographic Seal Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Hash className="h-4 w-4" />
                    <span>Cryptographic Merkle Tree Root (Rust Engine)</span>
                  </div>
                  <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {dossier.cryptographicProof?.leaf_count || 0} Evidence Leaves
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-slate-950/80 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800">
                  <span className="truncate">
                    {dossier.cryptographicProof?.merkle_root || 'No root computed'}
                  </span>
                  <button
                    onClick={handleCopyMerkleRoot}
                    className="shrink-0 p-1 text-slate-400 hover:text-white transition"
                    title="Copy Merkle Root"
                  >
                    {copiedRoot ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Engine: <span className="text-slate-200">{dossier.cryptographicProof?.engine}</span> | Generated:{' '}
                  <span className="text-slate-200">
                    {new Date(dossier.generatedAt).toLocaleString()}
                  </span>
                </p>
              </div>

              {/* Requirements & Outcome Verification Audit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Requirement-by-Requirement Evidence Audit
                  </h4>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      dossier.aiVerificationAudit?.outcome === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : dossier.aiVerificationAudit?.outcome === 'REVIEW_REQUIRED'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Audit Outcome: {dossier.aiVerificationAudit?.outcome || 'PENDING'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                  {dossier.agreement?.requirements?.map((req: any, idx: number) => {
                    const finding = dossier.aiVerificationAudit?.findings?.find(
                      (f: any) => f.requirementKey === req.key || f.requirementId === req.id
                    );
                    return (
                      <div key={idx} className="p-3.5 bg-white hover:bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700">
                              {req.key}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {req.title}
                            </span>
                          </div>
                          {finding ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                finding.status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : finding.status === 'PARTIALLY_VERIFIED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {finding.status} ({Math.round(finding.confidence * 100)}%)
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 font-medium">
                              Not Analyzed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">{req.description}</p>
                        {finding && finding.reasoning && (
                          <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            &ldquo;{finding.reasoning}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evidence Artifacts Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Verified Evidence Artifacts ({dossier.cryptographicEvidence?.totalItems || 0})
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                  {dossier.cryptographicEvidence?.items?.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      No evidence artifacts submitted yet.
                    </div>
                  ) : (
                    dossier.cryptographicEvidence?.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/50"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {item.kind}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                            SHA-256: {item.sha256}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          {item.status || 'VERIFIED'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070BA] hover:bg-[#003087] px-4 py-2 text-xs font-bold text-white transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download JSON Dossier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
