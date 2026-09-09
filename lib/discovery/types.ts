import type { ComparedAudition } from "@/lib/auditions/compare";
import type { AuditionStatus, AuditionTask } from "@/lib/auditions/types";
import type { DiscoveredAgent, MarketplaceCategory } from "@/lib/8004scan";

export interface DiscoveryRunSummary {
  runId: string;
  category: MarketplaceCategory;
  queryCount: number;
  uniqueRegistryMatches: number;
  qualifiedCandidates: number;
  ruleCompatibleCandidates: number;
  shortlistedCandidates: number;
  completedAuditions: number;
  startedAt: string;
  completedAt?: string;
  sourceApis: string[];
}

export type DiscoveryStreamEvent =
  | { type: "search-started"; runId: string; timestamp: string }
  | { type: "search-complete"; matches: number; registryTotal: number | null; sourceApis: string[] }
  | { type: "qualification-started"; candidates: number }
  | { type: "qualification-complete"; reachable: number }
  | { type: "rules-applied"; suitable: number }
  | { type: "shortlist-ready"; candidates: DiscoveredAgent[]; summary: DiscoveryRunSummary }
  | { type: "audition-started"; tokenId: number }
  | { type: "audition-complete"; tokenId: number; status: AuditionStatus; latencyMs: number | null; userMessage?: string }
  | { type: "comparison-started" }
  | { type: "comparison-ready"; results: ComparedAudition[]; summary: DiscoveryRunSummary }
  | { type: "warning"; code: "search-unavailable" | "no-candidates" | "no-completed-auditions"; userMessage: string }
  | { type: "done"; summary: DiscoveryRunSummary };

export interface DiscoveryRunInput {
  task: AuditionTask;
}
