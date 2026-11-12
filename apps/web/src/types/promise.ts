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

export type PaymentMode =
  | 'Real PayPal Sandbox'
  | 'Simulated Demo Mode'
  | 'Payment Failed'
  | 'Awaiting Buyer Approval';

export interface PaymentSummary {
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  state: string;
  amount: Money;
  createdAt?: string | null;
  capturedAt?: string | null;
  buyerApproved?: boolean;
  webhookVerified?: boolean;
  webhookStatus?: string;
  paymentMode?: PaymentMode;
  disbursementMode?: string | null;
  failureReason?: string | null;
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

export type ResolutionCaseStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'EVIDENCE_REQUESTED'
  | 'DECISION_RECORDED'
  | 'RESOLVED_COMPLETE'
  | 'RESOLVED_REFUNDED'
  | 'CLOSED';

export type ResolutionDecision =
  | 'MARK_COMPLETE'
  | 'REQUEST_EVIDENCE'
  | 'OPEN_REVIEW'
  | 'RECOMMEND_REFUND';

export interface CaseTimelineEvent {
  timestamp: string;
  actor: string;
  action: string;
  notes: string;
}

export interface ResolutionCase {
  caseId: string;
  promiseId: string;
  status: ResolutionCaseStatus;
  reason: string;
  submitter: string;
  submitterRole: string;
  decision?: ResolutionDecision | null;
  decisionReason?: string | null;
  decisionBy?: string | null;
  decidedAt?: string | null;
  refundId?: string | null;
  paypalRefundId?: string | null;
  refundedAmount?: string | null;
  refundedAt?: string | null;
  timeline: CaseTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ResolutionCaseListResponse {
  promiseId: string;
  items: ResolutionCase[];
  total: number;
}

export interface RefundResult {
  caseId: string;
  promiseId: string;
  refundId: string;
  paypalRefundId: string;
  amount: string;
  currency: string;
  status: string;
  idempotencyKey: string;
  executedAt: string;
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'NOT_VERIFIED'
  | 'HUMAN_REVIEW_REQUIRED';

export type VerificationOutcome =
  | 'COMPLETE'
  | 'REVIEW_REQUIRED'
  | 'OUTCOME_NOT_VERIFIED';

export interface RequirementFinding {
  requirementId: string;
  requirementKey?: string | null;
  status: VerificationStatus;
  confidence: number;
  evidenceIds: string[];
  reasoning: string;
  missingInformation: string[];
  limitations: string[];
  deterministicChecks?: Record<string, unknown>;
}

export interface VerificationRun {
  runId: string;
  promiseId: string;
  promiseVersion: number;
  state: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  outcome?: VerificationOutcome | null;
  overallConfidence?: number | null;
  results: RequirementFinding[];
  evidenceManifestHash: string;
  modelIdentifier: string;
  promptVersion: string;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export interface VerificationListResponse {
  promiseId: string;
  runs: VerificationRun[];
  total: number;
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
  metadata?: Record<string, any>;
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
