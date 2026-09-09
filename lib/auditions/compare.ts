import type { AuditionResult, TaskFitLabel } from "@/lib/auditions/types";
import { evaluateTaskGuardrails } from "@/lib/guardrails/evaluate";
import type { RuleEvaluation, TaskGuardrails } from "@/lib/guardrails/types";

export interface ComparedAudition extends AuditionResult {
  ruleEvaluation: RuleEvaluation;
  comparison: {
    rank: number;
    label: TaskFitLabel;
    reasons: string[];
  };
}

type EvaluatedAudition = AuditionResult & { ruleEvaluation: RuleEvaluation };

function statusRank(status: AuditionResult["status"]): number {
  if (status === "completed") return 4;
  if (status === "unsupported") return 3;
  if (status === "timeout") return 2;
  return 1;
}

function responseRank(result: AuditionResult): number {
  if (!result.output) return 0;
  if (result.responseKind === "capability-offer") return 1;
  // Older fixtures/results without responseKind are treated as task results so
  // this remains backwards-compatible while new live runs are explicit.
  return 2;
}

function compareEvidence(a: EvaluatedAudition, b: EvaluatedAudition): number {
  const hardConflictDelta = Number(a.ruleEvaluation.hardFailure) - Number(b.ruleEvaluation.hardFailure);
  if (hardConflictDelta) return hardConflictDelta;
  const statusDelta = statusRank(b.status) - statusRank(a.status);
  if (statusDelta) return statusDelta;

  const responseDelta = responseRank(b) - responseRank(a);
  if (responseDelta) return responseDelta;

  const ruleStrengthDelta = b.ruleEvaluation.passedCount - a.ruleEvaluation.passedCount;
  if (ruleStrengthDelta) return ruleStrengthDelta;

  const unknownDelta = a.ruleEvaluation.unknownCount - b.ruleEvaluation.unknownCount;
  if (unknownDelta) return unknownDelta;

  const quoteDelta = Number(Boolean(b.quote)) - Number(Boolean(a.quote));
  if (quoteDelta) return quoteDelta;

  const evidenceDelta = b.evidence.length - a.evidence.length;
  if (evidenceDelta) return evidenceDelta;

  const aLatency = a.latencyMs ?? Number.POSITIVE_INFINITY;
  const bLatency = b.latencyMs ?? Number.POSITIVE_INFINITY;
  if (aLatency !== bLatency) return aLatency - bLatency;

  return a.candidate.tokenId - b.candidate.tokenId;
}

function labelFor(result: EvaluatedAudition, rank: number, completedTaskCount: number): TaskFitLabel {
  if (result.ruleEvaluation.hardFailure) return "NOT ENOUGH EVIDENCE";
  if (result.status !== "completed" || !result.output) return "NOT ENOUGH EVIDENCE";
  if (result.responseKind === "capability-offer") return "PARTIAL FIT";
  if (rank === 1) return "BEST FIT";
  return completedTaskCount > 1 ? "STRONG FIT" : "PARTIAL FIT";
}

function comparisonReasons(result: EvaluatedAudition, rank: number): string[] {
  const reasons: string[] = [];
  if (result.status === "completed" && result.responseKind === "capability-offer") {
    reasons.push("Confirmed a live service/capability match, but did not execute the requested task during the audition.");
  } else if (result.status === "completed") {
    reasons.push("Completed the same bounded task-specific audition as the other candidates.");
  } else {
    reasons.push(`Did not complete the live audition (${result.status}).`);
  }

  if (result.output && result.responseKind !== "capability-offer") reasons.push("Returned a usable task-specific result.");
  if (result.ruleEvaluation.hardFailure) reasons.push("Doesn’t meet an explicit rule, so it cannot be selected as Best Match.");
  else if (result.ruleEvaluation.status === "partial") reasons.push("Some rule evidence could not be confirmed.");
  else if (result.ruleEvaluation.checks.length) reasons.push("The rules with available evidence were respected.");
  if (result.quote) reasons.push(`Returned a machine-readable quote of ${result.quote.amount} ${result.quote.asset}.`);
  if (result.latencyMs !== null) reasons.push(`Measured response latency: ${result.latencyMs} ms.`);
  reasons.push(`Preserved ${result.evidence.length} raw evidence item${result.evidence.length === 1 ? "" : "s"}.`);
  if (rank === 1 && result.status === "completed" && result.responseKind !== "capability-offer") {
    reasons.push("Ranked first by observable task completion, usable output, rule evidence, quote availability, preserved evidence, then measured latency — never by an invented trust score.");
  }
  return reasons;
}

export function compareAuditions(results: AuditionResult[], guardrails?: TaskGuardrails): ComparedAudition[] {
  const evaluated = results.map((result) => ({ ...result, ruleEvaluation: evaluateTaskGuardrails(result, guardrails ?? result.task.guardrails) }));
  const sorted = [...evaluated].sort(compareEvidence);
  const completedTaskCount = sorted.filter((result) => result.status === "completed" && result.output && result.responseKind !== "capability-offer").length;

  return sorted.map((result, index) => {
    const rank = index + 1;
    return {
      ...result,
      comparison: {
        rank,
        label: labelFor(result, rank, completedTaskCount),
        reasons: comparisonReasons(result, rank),
      },
    };
  });
}
