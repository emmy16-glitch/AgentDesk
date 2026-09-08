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

export interface IndependentVerification {
  status: "VERIFIED CONTEXT" | "CONFLICT" | "NOT VERIFIABLE" | "ERROR";
  category: string;
  checkedAt: string;
  blockNumber: string | null;
  blockTimestamp: string | null;
  outputHash: string;
  checks: IndependentCheckItem[];
  boundary: string;
}
