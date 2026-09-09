export type RiskTolerance = "low" | "moderate" | "high";
export type ActionPolicy = "analysis-only" | "propose-only" | "approval-required";
export type DataPolicy = "task-only" | "public-wallet-only";

export interface PriceLimit {
  amount: string;
  asset: string;
}

export interface TaskGuardrails {
  riskTolerance?: RiskTolerance;
  maxPrice?: PriceLimit;
  /** An empty list deliberately means any protocol is allowed. */
  approvedProtocols?: string[];
  actionPolicy: ActionPolicy;
  dataPolicy: DataPolicy;
}

export type RuleCheckStatus = "pass" | "fail" | "unknown";

export interface RuleCheck {
  id: "price" | "protocol" | "risk" | "action";
  label: string;
  status: RuleCheckStatus;
  summary: string;
  evidence?: string;
}

export interface RuleEvaluation {
  status: "fits" | "partial" | "conflict";
  checks: RuleCheck[];
  hardFailure: boolean;
  passedCount: number;
  failedCount: number;
  unknownCount: number;
}
