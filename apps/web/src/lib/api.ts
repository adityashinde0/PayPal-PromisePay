import {
  AtomicRequirement,
  EvidenceItem,
  EvidenceListResponse,
  Money,
  PromiseCategory,
  PromiseGraphResponse,
  PromiseListResponse,
  PromiseStatus,
} from '@/types/promise';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchPromises(params?: {
  category?: PromiseCategory;
  status?: PromiseStatus;
  q?: string;
}): Promise<PromiseListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.status) query.set('status', params.status);
  if (params?.q) query.set('q', params.q);

  const res = await fetch(`${API_BASE}/api/promises?${query.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch promises');
  return res.json();
}

export async function fetchPromise(promiseId: string): Promise<PromiseGraphResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch promise ${promiseId}`);
  return res.json();
}

export async function fetchCategoryTemplate(category: PromiseCategory): Promise<AtomicRequirement[]> {
  const res = await fetch(`${API_BASE}/api/promises/templates/${category}`);
  if (!res.ok) throw new Error('Failed to fetch template');
  return res.json();
}

export async function createPromise(payload: {
  category: PromiseCategory;
  title: string;
  promiseText: string;
  amount: Money;
  merchantOrderRef?: string;
}): Promise<PromiseGraphResponse> {
  const res = await fetch(`${API_BASE}/api/promises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create promise');
  }
  return res.json();
}

export async function updatePromise(
  promiseId: string,
  payload: {
    title?: string;
    promiseText?: string;
    requirements?: AtomicRequirement[];
  }
): Promise<PromiseGraphResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update promise');
  }
  return res.json();
}

export async function confirmPromise(promiseId: string): Promise<PromiseGraphResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/confirm`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to confirm promise');
  }
  return res.json();
}

export async function createPaymentOrder(promiseId: string): Promise<{
  promiseId: string;
  paypalOrderId: string;
  status: string;
}> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/payment-orders`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create PayPal payment order');
  }
  return res.json();
}

export async function capturePaymentOrder(
  promiseId: string,
  paypalOrderId: string
): Promise<{
  promiseId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  status: string;
}> {
  const res = await fetch(
    `${API_BASE}/api/promises/${promiseId}/payment-orders/${paypalOrderId}/capture`,
    {
      method: 'POST',
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to capture PayPal payment order');
  }
  return res.json();
}

// ==========================================
// Phase 3: Evidence API Methods
// ==========================================

export async function fetchPromiseEvidence(promiseId: string): Promise<EvidenceListResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/evidence`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch evidence for ${promiseId}`);
  }
  return res.json();
}

export async function submitEvidence(
  promiseId: string,
  payload: {
    kind: string;
    title?: string;
    source?: string;
    requirementIds: string[];
    submitterClaim: string;
    evidenceId?: string;
    storageKey?: string;
    sha256?: string;
    mimeType?: string;
    sizeBytes?: number;
  }
): Promise<EvidenceItem> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to register evidence');
  }
  return res.json();
}

export async function uploadEvidenceFile(
  promiseId: string,
  file: File,
  requirementIds: string[],
  submitterClaim: string,
  title?: string
): Promise<EvidenceItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('requirement_ids', JSON.stringify(requirementIds));
  formData.append('submitter_claim', submitterClaim);
  if (title) formData.append('title', title);

  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/evidence/files`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload evidence file');
  }
  return res.json();
}
