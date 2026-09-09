export type IndependentCheckStatus = "verified" | "conflict" | "not-verifiable" | "error";

export interface IndependentCheckItem {
  id: string;
  label: string;
  status: IndependentCheckStatus;
  summary: string;
  source: string;
  observedAt: string;
  raw?: unknown;
}

export type CategoryDepthVerdict =
  | "SUPPORTED BY LIVE CONTEXT"
  | "MIXED EVIDENCE"
  | "NOT ENOUGH EVIDENCE"
  | "CONFLICT WITH LIVE CONTEXT"
  | "CHECK FAILED";

export interface CategoryDepthSummary {
  verdict: CategoryDepthVerdict;
  title: string;
  scenarioLabel: string;
  verifiedCount: number;
  conflictCount: number;
  unresolvedCount: number;
  errorCount: number;
  machineReadableClaims: boolean;
  highlights: string[];
}

export interface IndependentVerification {
  status: "VERIFIED CONTEXT" | "CONFLICT" | "NOT VERIFIABLE" | "ERROR";
  category: string;
  checkedAt: string;
  blockNumber: string | null;
  blockTimestamp: string | null;
  outputHash: string;
  checks: IndependentCheckItem[];
  depth: CategoryDepthSummary;
  boundary: string;
}
