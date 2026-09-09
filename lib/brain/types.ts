import type { AuditionTask } from "@/lib/auditions/types";
import type { IndependentVerification } from "@/lib/auditions/verification-types";
import type { RuleEvaluation } from "@/lib/guardrails/types";

export type BrainDecision = "LEADING EVIDENCE" | "MIXED" | "INSUFFICIENT" | "CONFLICT";

export interface BrainAnalysis {
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
}

export interface BrainAnalysisInput {
  tokenId: number;
  task: AuditionTask;
  output: string;
  verification: IndependentVerification;
  ruleEvaluation?: RuleEvaluation;
}
