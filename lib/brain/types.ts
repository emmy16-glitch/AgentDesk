import type { AuditionTask } from "@/lib/auditions/types";
import type { IndependentVerification } from "@/lib/auditions/verification-types";

export type BrainProvider = "camber" | "agentdesk-evidence-engine";
export type BrainDecision = "LEADING EVIDENCE" | "MIXED" | "INSUFFICIENT" | "CONFLICT";

export interface BrainAnalysis {
  provider: BrainProvider;
  providerLabel: string;
  decision: BrainDecision;
  headline: string;
  summary: string;
  verifiedFacts: string[];
  unresolvedClaims: string[];
  conflicts: string[];
  watchouts: string[];
  nextQuestion: string | null;
  boundary: string;
  generatedAt: string;
  conversationId?: string;
  model?: string;
  fallbackReason?: string;
}

export interface BrainAnalysisInput {
  tokenId: number;
  task: AuditionTask;
  output: string;
  verification: IndependentVerification;
}
