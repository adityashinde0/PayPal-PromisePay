'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Globe, Lock, ShieldCheck } from 'lucide-react';
import { EvidenceItem } from '@/types/promise';
import { useAuth } from '@/context/AuthContext';

interface EvidenceVaultCardProps {
  evidenceList: EvidenceItem[];
  onAddEvidence: () => void;
}

export function EvidenceVaultCard({
  evidenceList,
  onAddEvidence,
}: EvidenceVaultCardProps) {
  const { role } = useAuth();
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<Record<string, boolean>>({});

  const canSubmitEvidence = role === 'SELLER' || role === 'ADMIN';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(text);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const togglePreview = (id: string) => {
    setExpandedPreview((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Multi-Modal Evidence Vault</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Scraper & Vision OCR V2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated headless web crawler, viewport captures, and Gemini Vision OCR extraction.
          </p>
        </div>

        {canSubmitEvidence ? (
          <button
            onClick={onAddEvidence}
            className="flex items-center gap-1.5 rounded-lg bg-[#0070BA] hover:bg-[#003087] text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
          >
            <span>+ Submit Evidence</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500">
            <Lock className="h-3 w-3" />
            <span>Seller Submission Gated (Your Role: {role})</span>
          </div>
        )}
      </div>

      {evidenceList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-slate-50">
          <p className="text-xs text-slate-500">No evidence submitted yet.</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Once payment is captured, the seller uploads artifacts or live URLs to verify completion.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {evidenceList.map((item) => {
            const crawlerMeta = item.provenance?.metadata?.crawler as any;
            const multimodalMeta = item.provenance?.metadata?.multimodalAi as any;
            const screenshotUri =
              (item.provenance?.metadata?.screenshotBase64 as string) ||
              crawlerMeta?.screenshotBase64;
            const isPreviewOpen = expandedPreview[item.evidenceId] ?? true;

            return (
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
                    <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-medium border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {item.provenance?.scannerStatus || 'SCAN_CLEAN'}
                    </span>
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#0070BA] hover:text-[#003087] underline flex items-center gap-0.5"
                      >
                        <span>Open Source</span>
                        <ExternalLink className="h-3 w-3" />
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

                {/* Live Headless Viewport / OCR Inspection Thumbnail (Goal 2) */}
                {screenshotUri && (
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div
                      onClick={() => togglePreview(item.evidenceId)}
                      className="flex items-center justify-between px-3 py-2 bg-slate-100/80 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200/60 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Automated Viewport & Deliverable Snapshot
                        </span>
                        {crawlerMeta?.statusCode && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            HTTP {crawlerMeta.statusCode} ({crawlerMeta.latencyMs}ms)
                          </span>
                        )}
                        {multimodalMeta?.provider && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            Gemini Multimodal OCR
                          </span>
                        )}
                      </div>
                      <button type="button" className="text-slate-400 hover:text-slate-600">
                        {isPreviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {isPreviewOpen && (
                      <div className="p-3 bg-slate-50/50 space-y-3">
                        <div className="relative overflow-hidden rounded-lg border border-slate-200 max-h-72 flex justify-center bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={screenshotUri}
                            alt="Live Scraped Deliverable Viewport"
                            className="w-full object-contain max-h-72 rounded"
                          />
                        </div>

                        {/* OCR / Scraped Requirement Matches */}
                        {(crawlerMeta?.sections || multimodalMeta?.requirementMappings) && (
                          <div className="rounded-lg bg-blue-50/70 border border-blue-200/80 p-2.5 text-xs space-y-1.5">
                            <span className="font-bold text-[11px] uppercase tracking-wider text-blue-900 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-700" />
                              Visual Fulfillment Highlights
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {crawlerMeta?.sections?.slice(0, 3).map((sec: any, idx: number) => (
                                <div key={idx} className="bg-white p-1.5 rounded border border-blue-100 text-[11px]">
                                  <span className="font-bold text-blue-800 block truncate">{sec.type?.toUpperCase()}</span>
                                  <span className="text-slate-600 truncate block">{sec.text}</span>
                                </div>
                              ))}
                              {multimodalMeta?.requirementMappings?.slice(0, 2).map((m: any, idx: number) => (
                                <div key={idx} className="bg-white p-1.5 rounded border border-blue-100 text-[11px]">
                                  <span className="font-bold text-purple-800 block truncate">{m.requirementKey}</span>
                                  <span className="text-slate-600 truncate block">{m.evidenceSnippet}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                      className="text-[10px] text-[#0070BA] hover:text-[#003087] ml-1 font-semibold"
                    >
                      {copiedSha === item.sha256 ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Submitted:</span>{' '}
                    <span>{new Date(item.provenance?.receivedAt || Date.now()).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Supports:</span>{' '}
                    <span className="font-mono text-slate-700">{item.requirementIds.join(', ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
