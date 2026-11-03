'use client';

import React, { useState, useEffect } from 'react';
import { EvidenceKind, PromiseGraphResponse } from '@/types/promise';
import { submitEvidence, uploadEvidenceFile } from '@/lib/api';

interface SubmitEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  promise: PromiseGraphResponse;
  onSuccess: () => Promise<void>;
}

export function SubmitEvidenceModal({
  isOpen,
  onClose,
  promise,
  onSuccess,
}: SubmitEvidenceModalProps) {
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('live_url');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceSource, setEvidenceSource] = useState('');
  const [submitterClaim, setSubmitterClaim] = useState('');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleRequirement = (reqId: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setEvidenceError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmittingEvidence(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">Submit Verifiable Evidence</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {evidenceError && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            {evidenceError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Evidence Type</label>
            <select
              value={evidenceKind}
              onChange={(e) => setEvidenceKind(e.target.value as EvidenceKind)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
            >
              <option value="live_url">Live URL / Web Deployment</option>
              <option value="repository">Git Repository / Commit SHA</option>
              <option value="document">Document / PDF Report</option>
              <option value="screenshot">Screenshot / Image Proof</option>
              <option value="tracking_reference">Carrier Tracking / Logistics ID</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Evidence Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Production URL on Vercel"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          {(evidenceKind === 'document' || evidenceKind === 'screenshot') ? (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Upload File (or supply URL below)
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      if (!evidenceTitle) setEvidenceTitle(e.target.files[0].name);
                    }
                  }}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Or Remote URL Source</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={evidenceSource}
                  onChange={(e) => setEvidenceSource(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Source Reference (URL, Commit SHA, or Tracking ID) *
              </label>
              <input
                type="text"
                placeholder={
                  evidenceKind === 'live_url'
                    ? 'https://my-app.vercel.app'
                    : evidenceKind === 'repository'
                    ? 'https://github.com/org/repo/commit/a1b2c3d4...'
                    : '1Z9999999999999999'
                }
                value={evidenceSource}
                onChange={(e) => setEvidenceSource(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Supporting Atomic Requirements *
            </label>
            <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
              {promise.requirements.map((req) => {
                const reqKey = req.id || req.key;
                const isSelected = selectedReqIds.includes(reqKey) || selectedReqIds.includes(req.key);
                return (
                  <label key={req.key} className="flex items-start gap-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRequirement(req.key)}
                      className="mt-0.5 rounded text-blue-600"
                    />
                    <div className="flex-1">
                      <span className="font-mono font-bold text-slate-700 mr-1">[{req.key}]</span>
                      <span className="text-slate-800">{req.title}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Submitter Claim (What does this prove?) *
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Deployed live version with responsive mobile cart and Stripe/PayPal checkout working..."
              value={submitterClaim}
              onChange={(e) => setSubmitterClaim(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEvidence}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {submittingEvidence ? 'Submitting...' : 'Upload & Seal Proof'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
