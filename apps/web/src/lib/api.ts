import {
  AtomicRequirement,
  EvidenceItem,
  EvidenceListResponse,
  Money,
  PromiseCategory,
  PromiseGraphResponse,
  PromiseListResponse,
  PromiseStatus,
  RefundResult,
  ResolutionCase,
  ResolutionCaseListResponse,
  ResolutionDecision,
  VerificationListResponse,
  VerificationRun,
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

// ==========================================
// Phase 4: AI Verification API Methods
// ==========================================

export async function triggerVerification(
  promiseId: string,
  options?: { evidenceIds?: string[]; forceRerun?: boolean }
): Promise<VerificationRun> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/verifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to trigger verification run');
  }
  return res.json();
}

export async function fetchVerificationRun(
  promiseId: string,
  runId: string
): Promise<VerificationRun> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/verifications/${runId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch verification run ${runId}`);
  }
  return res.json();
}

export async function listVerificationRuns(
  promiseId: string
): Promise<VerificationListResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/verifications`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to list verifications for ${promiseId}`);
  }
  return res.json();
}

// ==========================================
// Phase 5: Resolution & Refund API Methods
// ==========================================

export async function openResolutionCase(
  promiseId: string,
  payload: {
    reason: string;
    requestedOutcome?: string;
    submitter?: string;
    role?: string;
  }
): Promise<ResolutionCase> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/resolution-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to open resolution case');
  }
  return res.json();
}

export async function fetchResolutionCase(caseId: string): Promise<ResolutionCase> {
  const res = await fetch(`${API_BASE}/api/resolution-cases/${caseId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch case ${caseId}`);
  }
  return res.json();
}

export async function listResolutionCases(
  promiseId: string
): Promise<ResolutionCaseListResponse> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/resolution-cases`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to list cases for ${promiseId}`);
  }
  return res.json();
}

export async function recordCaseDecision(
  caseId: string,
  payload: {
    decision: ResolutionDecision;
    reason: string;
    reviewer?: string;
  }
): Promise<ResolutionCase> {
  const res = await fetch(`${API_BASE}/api/resolution-cases/${caseId}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to record reviewer decision');
  }
  return res.json();
}

export async function executeCaseRefund(
  caseId: string,
  payload: {
    reason: string;
    amountValue?: string;
    actor?: string;
  },
  idempotencyKey: string
): Promise<RefundResult> {
  const res = await fetch(`${API_BASE}/api/resolution-cases/${caseId}/refunds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to execute PayPal refund');
  }
  return res.json();
}


export async function fetchDisputeDefenseDossier(promiseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/promises/${promiseId}/dispute-defense-dossier`);
  if (!res.ok) throw new Error(`Failed to fetch dispute defense dossier for ${promiseId}`);
  return res.json();
}
