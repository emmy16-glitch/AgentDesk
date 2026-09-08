import { keccak256, toHex, type Hex } from "viem";
import type { ComparedAudition } from "@/lib/auditions/compare";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]),
  );
}

function hashValue(value: unknown): Hex {
  return keccak256(toHex(JSON.stringify(canonical(value))));
}

export interface AuditionReceiptCommitment {
  version: "agentdesk-audition-receipt-v1";
  receiptHash: Hex;
  taskHash: Hex;
  outputHash: Hex | null;
  evidenceHash: Hex;
  candidateTokenId: number;
  candidateWallet: string | null;
  checkedAt: string;
}

export function buildAuditionReceipt(result: ComparedAudition): AuditionReceiptCommitment {
  const taskHash = hashValue(result.task);
  const outputHash = result.output ? hashValue(result.output) : null;
  const evidenceHash = hashValue(result.evidence.map((item) => ({
    kind: item.kind,
    source: item.source,
    observedAt: item.observedAt,
    summary: item.summary,
    rawHash: item.raw === undefined ? null : hashValue(item.raw),
  })));

  const receiptPayload = {
    version: "agentdesk-audition-receipt-v1",
    candidate: result.candidate,
    taskHash,
    outputHash,
    evidenceHash,
    latencyMs: result.latencyMs,
    quote: result.quote,
    checkedAt: result.checkedAt,
    status: result.status,
    taskFit: result.taskFit,
    comparison: result.comparison,
  };

  return {
    version: "agentdesk-audition-receipt-v1",
    receiptHash: hashValue(receiptPayload),
    taskHash,
    outputHash,
    evidenceHash,
    candidateTokenId: result.candidate.tokenId,
    candidateWallet: result.candidate.agentWallet,
    checkedAt: result.checkedAt,
  };
}
