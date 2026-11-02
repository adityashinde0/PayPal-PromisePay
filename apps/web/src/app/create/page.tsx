'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AtomicRequirement,
  PromiseCategory,
  PromiseGraphResponse,
} from '@/types/promise';
import { createPromise, confirmPromise } from '@/lib/api';

const CATEGORIES: {
  id: PromiseCategory;
  name: string;
  description: string;
  sampleTitle: string;
  sampleText: string;
  sampleAmount: string;
}[] = [
  {
    id: 'digital_project',
    name: 'Digital Project',
    description: 'Web apps, APIs, custom software deliveries with repo and live URL proof.',
    sampleTitle: 'Next.js E-Commerce Storefront',
    sampleText: 'Deliver a mobile-responsive Next.js storefront with customer catalog, shopping cart, and live deployment on Vercel.',
    sampleAmount: '500.00',
  },
  {
    id: 'professional_document',
    name: 'Professional Document',
    description: 'Security whitepapers, architecture designs, audits, and technical specifications.',
    sampleTitle: 'SOC2 Security Architecture Whitepaper',
    sampleText: 'Comprehensive 15-page security architecture whitepaper covering STRIDE threat model, access controls, and data flow.',
    sampleAmount: '350.00',
  },
  {
    id: 'delivery',
    name: 'Delivery / Physical',
    description: 'Hardware prototypes, sample kits, and physical shipments with carrier tracking.',
    sampleTitle: 'IoT Sensor Dev Kit Dispatch',
    sampleText: 'Express shipment of IoT sensor hardware kit with tracking number and signed delivery receipt.',
    sampleAmount: '120.00',
  },
];

export default function CreatePromisePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<PromiseCategory>('digital_project');
  const [title, setTitle] = useState(CATEGORIES[0].sampleTitle);
  const [promiseText, setPromiseText] = useState(CATEGORIES[0].sampleText);
  const [amount, setAmount] = useState(CATEGORIES[0].sampleAmount);
  const [merchantOrderRef, setMerchantOrderRef] = useState('DEMO-ORD-101');

  // Multi-step state: 1: Enter details -> 2: Review extracted requirements
  const [step, setStep] = useState<1 | 2>(1);
  const [draftPromise, setDraftPromise] = useState<PromiseGraphResponse | null>(null);
  const [requirements, setRequirements] = useState<AtomicRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (cat: PromiseCategory) => {
    setSelectedCategory(cat);
    const meta = CATEGORIES.find((c) => c.id === cat);
    if (meta) {
      setTitle(meta.sampleTitle);
      setPromiseText(meta.sampleText);
      setAmount(meta.sampleAmount);
    }
  };

  const handleExtractAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createPromise({
        category: selectedCategory,
        title,
        promiseText,
        amount: { currencyCode: 'USD', value: amount },
        merchantOrderRef: merchantOrderRef || undefined,
      });
      setDraftPromise(created);
      setRequirements(created.requirements);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create promise');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequirement = (index: number, field: keyof AtomicRequirement, value: any) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    setRequirements(updated);
  };

  const handleDeleteRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleAddRequirement = () => {
    const newReq: AtomicRequirement = {
      key: `REQ-${requirements.length + 1}`,
      title: 'New Verifiable Requirement',
      description: 'Describe the verifiable outcome here.',
      priority: 2,
      verificationMethod: 'URL_SCREENSHOT_ANALYSIS',
    };
    setRequirements([...requirements, newReq]);
  };

  const handleConfirmPromise = async () => {
    if (!draftPromise) return;
    setLoading(true);
    setError(null);
    try {
      await confirmPromise(draftPromise.promiseId);
      router.push(`/promises/${draftPromise.promiseId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm promise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Create New Promise</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define what outcome is promised before taking payment. AI extracts atomic requirements for explainable verification.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleExtractAndCreate} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Agreement Category</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selectedCategory === cat.id
                      ? 'border-[#0070BA] bg-blue-50/50 shadow-sm ring-2 ring-[#0070BA]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{cat.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Promise Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Next.js Headless Storefront"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (USD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">$</span>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="500.00"
                />
              </div>
            </div>
          </div>

          {/* Statement of Work / Agreement */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Agreement / Scope Description
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Free-form agreement terms or proposal. AI will parse this into atomic, verifiable checkpoints.
            </p>
            <textarea
              required
              rows={5}
              value={promiseText}
              onChange={(e) => setPromiseText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe deliverables, features, sections, or delivery terms..."
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              <span className="text-xs text-slate-400">Merchant Reference: </span>
              <input
                type="text"
                value={merchantOrderRef}
                onChange={(e) => setMerchantOrderRef(e.target.value)}
                className="text-xs border rounded px-2 py-1 text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0070BA] px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#003087] transition-colors disabled:opacity-50"
            >
              {loading ? 'Extracting with AI...' : 'Create Draft & Extract Requirements →'}
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Review and Edit Extracted Requirements */
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Draft Created</span>
                <h3 className="text-lg font-bold text-slate-900">{draftPromise?.promiseId}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{title} &bull; ${amount} USD</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                Status: DRAFT
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Extracted Atomic Requirements</h4>
                <p className="text-xs text-slate-500">
                  Review and edit requirements before confirming. You must explicitly approve these before buyer checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="text-xs font-semibold text-[#0070BA] hover:text-[#003087] border border-blue-200 rounded px-3 py-1.5 bg-white"
              >
                + Add Requirement
              </button>
            </div>

            <div className="space-y-4">
              {requirements.map((req, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {req.key}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRequirement(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={req.title}
                        onChange={(e) => handleUpdateRequirement(idx, 'title', e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Verification Method</label>
                      <select
                        value={req.verificationMethod}
                        onChange={(e) => handleUpdateRequirement(idx, 'verificationMethod', e.target.value)}
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-700 bg-white"
                      >
                        <option value="URL_SCREENSHOT_ANALYSIS">URL_SCREENSHOT_ANALYSIS</option>
                        <option value="URL_FUNCTIONAL_AUDIT">URL_FUNCTIONAL_AUDIT</option>
                        <option value="GIT_REPO_AND_DNS_CHECK">GIT_REPO_AND_DNS_CHECK</option>
                        <option value="DOCUMENT_STRUCTURE_ANALYSIS">DOCUMENT_STRUCTURE_ANALYSIS</option>
                        <option value="DOCUMENT_METRIC_CHECK">DOCUMENT_METRIC_CHECK</option>
                        <option value="CARRIER_TRACKING_ADAPTER">CARRIER_TRACKING_ADAPTER</option>
                        <option value="CARRIER_DELIVERY_CONFIRM">CARRIER_DELIVERY_CONFIRM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Verifiable Outcome Description</label>
                    <textarea
                      rows={2}
                      value={req.description}
                      onChange={(e) => handleUpdateRequirement(idx, 'description', e.target.value)}
                      className="w-full rounded border border-slate-200 p-2 text-xs text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              &larr; Back to Agreement Text
            </button>
            <button
              type="button"
              disabled={loading || requirements.length === 0}
              onClick={handleConfirmPromise}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Confirming...' : 'Approve & Lock Requirements for Payment &rarr;'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

