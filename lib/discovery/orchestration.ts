import { randomUUID } from "node:crypto";
import { compareAuditions } from "@/lib/auditions/compare";
import { runAudition } from "@/lib/auditions/engine";
import type { AuditionResult } from "@/lib/auditions/types";
import { searchBscAgentsByQuery, type DiscoveredAgent } from "@/lib/8004scan";
import { qualifyCandidates, type QualifiedCandidate } from "@/lib/discovery/qualify";
import { planDiscoveryQueries } from "@/lib/discovery/query-plan";
import type { DiscoveryRunInput, DiscoveryRunSummary, DiscoveryStreamEvent } from "@/lib/discovery/types";

const MAX_REGISTRY_CANDIDATES = 24;
const MAX_QUALIFIED_CANDIDATES = 16;
const MAX_AUDITION_FINALISTS = 4;

export const DISCOVERY_LIMITS = {
  registryCandidates: MAX_REGISTRY_CANDIDATES,
  qualifiedCandidates: MAX_QUALIFIED_CANDIDATES,
  auditionFinalists: MAX_AUDITION_FINALISTS,
} as const;

export interface DiscoveryDependencies {
  search(query: string): ReturnType<typeof searchBscAgentsByQuery>;
  qualify(candidates: DiscoveredAgent[]): ReturnType<typeof qualifyCandidates>;
  audition(input: { tokenId: number; task: DiscoveryRunInput["task"] }): Promise<AuditionResult>;
  compare(results: AuditionResult[], guardrails: DiscoveryRunInput["task"]["guardrails"]): ReturnType<typeof compareAuditions>;
}

const defaultDependencies: DiscoveryDependencies = {
  search: searchBscAgentsByQuery,
  qualify: qualifyCandidates,
  audition: runAudition,
  compare: compareAuditions,
};

function timestamp(): string {
  return new Date().toISOString();
}

function stableKey(agent: DiscoveredAgent): string {
  return `${agent.chainId}:${agent.tokenId}`;
}

export function dedupeRegistryCandidates(agents: Iterable<DiscoveredAgent>): DiscoveredAgent[] {
  const unique = new Map<string, DiscoveredAgent>();
  for (const agent of agents) unique.set(stableKey(agent), agent);
  return [...unique.values()];
}

function relevance(agent: DiscoveredAgent, task: DiscoveryRunInput["task"]): number {
  const haystack = `${agent.name} ${agent.description} ${agent.categories.join(" ")} ${agent.categoryEvidence[task.category]?.join(" ") ?? ""}`.toLowerCase();
  const terms = task.category === "Yield Optimisation"
    ? [task.asset, "yield", task.guardrails?.approvedProtocols?.[0]]
    : task.category === "Grid Trading"
      ? [task.pair, "grid", task.guardrails?.approvedProtocols?.[0]]
      : task.category === "Health Factor Monitoring"
        ? [task.protocol, "health", "liquidation", task.guardrails?.approvedProtocols?.[0]]
        : ["rebalance", "allocation", task.guardrails?.approvedProtocols?.[0]];
  return terms.filter((term) => term && haystack.includes(term.toLowerCase())).length + (agent.categories.includes(task.category) ? 2 : 0);
}

function shortlist(candidates: QualifiedCandidate[], task: DiscoveryRunInput["task"]): QualifiedCandidate[] {
  return [...candidates]
    .sort((left, right) => relevance(right.agent, task) - relevance(left.agent, task) || left.agent.tokenId - right.agent.tokenId)
    .slice(0, MAX_AUDITION_FINALISTS);
}

function friendlyAuditionStatus(result: AuditionResult): string | undefined {
  if (result.status === "timeout") return "Took too long";
  if (result.status !== "completed") return "Couldn’t finish";
  return undefined;
}

export async function* runDiscoveryStream(
  input: DiscoveryRunInput,
  dependencies: DiscoveryDependencies = defaultDependencies,
): AsyncGenerator<DiscoveryStreamEvent> {
  const startedAt = timestamp();
  const runId = randomUUID();
  const queries = planDiscoveryQueries(input.task);
  const summary: DiscoveryRunSummary = {
    runId,
    category: input.task.category,
    queryCount: queries.length,
    uniqueRegistryMatches: 0,
    qualifiedCandidates: 0,
    ruleCompatibleCandidates: 0,
    shortlistedCandidates: 0,
    completedAuditions: 0,
    startedAt,
    sourceApis: [],
  };

  yield { type: "search-started", runId, timestamp: startedAt };
  const searchSettled = await Promise.allSettled(queries.map((query) => dependencies.search(query)));
  const sourceApis = new Set<string>();
  const discovered: DiscoveredAgent[] = [];
  for (const entry of searchSettled) {
    if (entry.status !== "fulfilled") continue;
    sourceApis.add(entry.value.sourceApi);
    for (const agent of entry.value.agents) {
      if (!agent.categories.includes(input.task.category)) continue;
      discovered.push(agent);
    }
  }
  const unique = dedupeRegistryCandidates(discovered);
  summary.sourceApis = [...sourceApis];
  summary.uniqueRegistryMatches = unique.length;
  if (!unique.length) {
    if (searchSettled.every((entry) => entry.status === "rejected")) {
      yield { type: "warning", code: "search-unavailable", userMessage: "We’re having trouble searching the registry right now." };
    } else {
      yield { type: "warning", code: "no-candidates", userMessage: "No matching agents found for this task. Try adjusting your task or rules." };
    }
    summary.completedAt = timestamp();
    yield { type: "search-complete", matches: 0, registryTotal: null, sourceApis: summary.sourceApis };
    yield { type: "done", summary };
    return;
  }

  yield { type: "search-complete", matches: unique.length, registryTotal: null, sourceApis: summary.sourceApis };
  const candidatePool = unique
    .sort((left, right) => relevance(right, input.task) - relevance(left, input.task) || left.tokenId - right.tokenId)
    .slice(0, MAX_REGISTRY_CANDIDATES);

  yield { type: "qualification-started", candidates: candidatePool.length };
  const qualified = await dependencies.qualify(candidatePool.slice(0, MAX_QUALIFIED_CANDIDATES));
  summary.qualifiedCandidates = qualified.length;
  yield { type: "qualification-complete", reachable: qualified.length };

  // Indexed metadata cannot safely prove most rules. Keep unknown candidates in
  // the pool and let the evidence-bound audition evaluator decide later.
  const ruleCompatible = qualified;
  summary.ruleCompatibleCandidates = ruleCompatible.length;
  yield { type: "rules-applied", suitable: ruleCompatible.length };
  const finalists = shortlist(ruleCompatible, input.task);
  summary.shortlistedCandidates = finalists.length;
  if (!finalists.length) {
    yield { type: "warning", code: "no-candidates", userMessage: "We couldn’t find enough available agents right now." };
    summary.completedAt = timestamp();
    yield { type: "done", summary };
    return;
  }

  yield { type: "shortlist-ready", candidates: finalists.map((entry) => entry.agent), summary: { ...summary } };
  for (const finalist of finalists) yield { type: "audition-started", tokenId: finalist.agent.tokenId };

  const pending = finalists.map(({ agent }) => ({
    tokenId: agent.tokenId,
    promise: dependencies.audition({ tokenId: agent.tokenId, task: input.task })
      .then((result) => ({ tokenId: agent.tokenId, result, failure: null as string | null }))
      .catch(() => ({ tokenId: agent.tokenId, result: null, failure: "Couldn’t finish" })),
  }));
  const completed: AuditionResult[] = [];
  while (pending.length) {
    const outcome = await Promise.race(pending.map((entry) => entry.promise));
    const index = pending.findIndex((entry) => entry.tokenId === outcome.tokenId);
    if (index >= 0) pending.splice(index, 1);
    if (outcome.result) {
      completed.push(outcome.result);
      yield { type: "audition-complete", tokenId: outcome.tokenId, status: outcome.result.status, latencyMs: outcome.result.latencyMs, ...(friendlyAuditionStatus(outcome.result) ? { userMessage: friendlyAuditionStatus(outcome.result) } : {}) };
    } else {
      yield { type: "audition-complete", tokenId: outcome.tokenId, status: "error", latencyMs: null, userMessage: "Couldn’t finish" };
    }
  }

  summary.completedAuditions = completed.filter((result) => result.status === "completed" && result.output).length;
  if (!summary.completedAuditions) {
    yield { type: "warning", code: "no-completed-auditions", userMessage: "The available agents couldn’t complete this task." };
    summary.completedAt = timestamp();
    yield { type: "done", summary };
    return;
  }
  yield { type: "comparison-started" };
  const results = dependencies.compare(completed, input.task.guardrails);
  summary.completedAt = timestamp();
  yield { type: "comparison-ready", results, summary: { ...summary } };
  yield { type: "done", summary };
}
