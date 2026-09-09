export type PaidToolId = "cournot" | "telegraph";
export type PaidToolRail = "b402" | "x402" | "b402-or-x402";
export type ExecutionPermission = "disabled" | "approval-required";

export interface ToolSpendLimit {
  amount: string;
  asset: string;
}

/**
 * Final-hire capability permissions. These are separate from pre-hire task
 * guardrails because they control what a hired agent may request after the
 * user chooses a provider. They are inserted into provider-signed hire terms.
 */
export interface HireCapabilityPolicy {
  version: "agentdesk-hire-capabilities-v1";
  externalIntelligence: boolean;
  paidIntelligence: boolean;
  approvedPaidTools: PaidToolId[];
  /** Maximum price AgentDesk policy may accept for one paid tool proposal. */
  maxToolSpend?: ToolSpendLimit;
  execution: ExecutionPermission;
  /** Bounded permission/job window selected by the user. */
  permissionDurationDays: 1 | 7 | 30;
}

export interface PaidToolDefinition {
  id: PaidToolId;
  label: string;
  category: "probability-intelligence" | "evidence-intelligence";
  paymentRail: PaidToolRail;
  description: string;
  readOnlyResult: true;
  pricing: "provider-quoted";
  proofBoundary: string;
}
