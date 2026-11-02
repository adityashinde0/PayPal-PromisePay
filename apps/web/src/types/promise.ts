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

