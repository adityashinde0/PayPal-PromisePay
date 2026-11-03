'use client';

import React, { useState } from 'react';
import { EvidenceItem } from '@/types/promise';

interface EvidenceVaultCardProps {
  evidenceList: EvidenceItem[];
  onAddEvidence: () => void;
}

export function EvidenceVaultCard({
  evidenceList,
  onAddEvidence,
}: EvidenceVaultCardProps) {
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(text);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  return (
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
          onClick={onAddEvidence}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
        >
          <span>+ Submit Evidence</span>
        </button>
      </div>

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
  );
}

