export type PromiseCategory = 'digital_project' | 'professional_document' | 'delivery';

export type PromiseStatus =
  | 'DRAFT'
  | 'READY_FOR_PAYMENT'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FULFILLMENT'
  | 'EVIDENCE_SUBMITTED'
  | 'VERIFYING'
  | 'COMPLETE'
  | 'REVIEW_REQUIRED'
  | 'OUTCOME_NOT_VERIFIED'
  | 'RESOLVED'
  | 'CANCELLED';

export interface Money {
  currencyCode: string;
  value: string;
}

export interface AtomicRequirement {
  id?: string;
  key: string;
  title: string;
  description: string;
  priority: number;
  verificationMethod: string;
}

export interface PaymentSummary {
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  state: string;
  amount: Money;
}

export interface VerificationSummary {
  latestRunId?: string | null;
  status: string;
  confidence?: number | null;
  outcome?: string | null;
  completedAt?: string | null;
}

export interface ResolutionSummary {
  caseId?: string | null;
  status: string;
  decision?: string | null;
  reason?: string | null;
}

export interface AuditTimelineEvent {
  timestamp: string;
  actor: string;
  eventType: string;
  summary: string;
}

export type EvidenceKind =
  | 'live_url'
  | 'repository'
  | 'screenshot'
  | 'document'
  | 'tracking_reference'
  | 'delivery_confirmation'
  | 'metadata';

export type EvidenceStatus =
  | 'SUBMITTED'
  | 'PENDING_SCAN'
  | 'SCAN_CLEAN'
  | 'SUSPICIOUS'
  | 'REJECTED';

export interface EvidenceProvenance {
  receivedAt: string;
  submittedBy: string;
  uploaderRole: string;
  sourceHost?: string | null;
  canonicalUri?: string | null;
  sha256: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  scannerStatus: string;
  scannerVersion: string;
  isClaimOnly: boolean;
  metadata?: Record<string, unknown>;
}

export interface EvidenceItem {
  evidenceId: string;
  promiseId: string;
  kind: EvidenceKind;
  title: string;
  sourceUri?: string | null;
  canonicalUri?: string | null;
  storageKey?: string | null;
  sha256: string;
  requirementIds: string[];
  submitterClaim: string;
  uploader: string;
  status: EvidenceStatus;
  provenance: EvidenceProvenance;
  downloadUrl?: string | null;
  createdAt: string;
}

export interface EvidenceListResponse {
  promiseId: string;
  items: EvidenceItem[];
  total: number;
}

export interface PromiseGraphResponse {
  promiseId: string;
  organizationId: string;
  title: string;
  category: PromiseCategory;
  status: PromiseStatus;
  amount: Money;
  currentVersion: number;
  requirements: AtomicRequirement[];
  payment: PaymentSummary;
  verification: VerificationSummary;
  resolution: ResolutionSummary;
  timeline: AuditTimelineEvent[];
  evidence?: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PromiseSummaryResponse {
  promiseId: string;
  title: string;
  category: PromiseCategory;
  status: PromiseStatus;
  amount: Money;
  paymentState: string;
  outcome?: string | null;
  confidence?: number | null;
  createdAt: string;
}

export interface PromiseListResponse {
  items: PromiseSummaryResponse[];
  total: number;
}
