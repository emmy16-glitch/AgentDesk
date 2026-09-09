import type { PaidToolId } from "@/lib/capabilities/types";

export type AuthorizationDecision = "ALLOW" | "HOLD" | "BLOCK";
export type ProposedActionKind = "external-intelligence" | "paid-tool-call" | "transaction";

export interface AuthorizationProposal {
  kind: ProposedActionKind;
  description?: string;
  toolId?: PaidToolId;
  amount?: string;
  asset?: string;
  recipient?: string;
  protocol?: string;
  chainId?: number;
  reference?: string;
}

export interface AuthorizationCheck {
  id: string;
  status: "pass" | "fail" | "unknown";
  summary: string;
}

export interface AuthorizationEvaluation {
  decision: AuthorizationDecision;
  reason: string;
  checks: AuthorizationCheck[];
  executable: false;
  source: "agentdesk-capability-policy" | "auctorail-preflight";
  boundary: string;
}
