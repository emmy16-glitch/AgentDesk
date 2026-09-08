import type { AuditionResult, TaskFitLabel } from "@/lib/auditions/types";

export interface ComparedAudition extends AuditionResult {
  comparison: {
    rank: number;
    label: TaskFitLabel;
    reasons: string[];
  };
}

function statusRank(status: AuditionResult["status"]): number {
  if (status === "completed") return 4;
  if (status === "unsupported") return 3;
  if (status === "timeout") return 2;
  return 1;
}

function compareEvidence(a: AuditionResult, b: AuditionResult): number {
  const statusDelta = statusRank(b.status) - statusRank(a.status);
  if (statusDelta) return statusDelta;

  const outputDelta = Number(Boolean(b.output)) - Number(Boolean(a.output));
  if (outputDelta) return outputDelta;

  const quoteDelta = Number(Boolean(b.quote)) - Number(Boolean(a.quote));
  if (quoteDelta) return quoteDelta;

  const evidenceDelta = b.evidence.length - a.evidence.length;
  if (evidenceDelta) return evidenceDelta;

  const aLatency = a.latencyMs ?? Number.POSITIVE_INFINITY;
  const bLatency = b.latencyMs ?? Number.POSITIVE_INFINITY;
  if (aLatency !== bLatency) return aLatency - bLatency;

  return a.candidate.tokenId - b.candidate.tokenId;
}

function labelFor(result: AuditionResult, rank: number, completedCount: number): TaskFitLabel {
  if (result.status !== "completed" || !result.output) return "NOT ENOUGH EVIDENCE";
  if (rank === 1) return "BEST FIT";
  return completedCount > 1 ? "STRONG FIT" : "PARTIAL FIT";
}

function comparisonReasons(result: AuditionResult, rank: number): string[] {
  const reasons: string[] = [];
  if (result.status === "completed") reasons.push("Completed the same bounded task-specific audition as the other candidates.");
  else reasons.push(`Did not complete the live audition (${result.status}).`);

  if (result.output) reasons.push("Returned a usable task-specific result.");
  if (result.quote) reasons.push(`Returned a machine-readable quote of ${result.quote.amount} ${result.quote.asset}.`);
  if (result.latencyMs !== null) reasons.push(`Measured response latency: ${result.latencyMs} ms.`);
  reasons.push(`Preserved ${result.evidence.length} raw evidence item${result.evidence.length === 1 ? "" : "s"}.`);
  if (rank === 1 && result.status === "completed") {
    reasons.push("Ranked first by observable audition completion, usable output, quote availability, preserved evidence, then measured latency — never by an invented trust score.");
  }
  return reasons;
}

export function compareAuditions(results: AuditionResult[]): ComparedAudition[] {
  const sorted = [...results].sort(compareEvidence);
  const completedCount = sorted.filter((result) => result.status === "completed" && result.output).length;

  return sorted.map((result, index) => {
    const rank = index + 1;
    return {
      ...result,
      comparison: {
        rank,
        label: labelFor(result, rank, completedCount),
        reasons: comparisonReasons(result, rank),
      },
    };
  });
}
