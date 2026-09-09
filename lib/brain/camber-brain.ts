import { chatWithCamber } from "@/lib/camber";
import type { BrainAnalysis, BrainAnalysisInput, BrainDecision } from "@/lib/brain/types";

const DECISIONS = new Set<BrainDecision>(["LEADING EVIDENCE", "MIXED", "INSUFFICIENT", "CONFLICT"]);

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const text = asString(entry);
    return text ? [text] : [];
  }).slice(0, 8);
}

function extractJson(answer: string): Record<string, unknown> | null {
  const candidates: string[] = [answer.trim()];
  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of answer.matchAll(fence)) {
    if (match[1]?.trim()) candidates.push(match[1].trim());
  }
  const first = answer.indexOf("{");
  const last = answer.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(answer.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const value = asObject(JSON.parse(candidate));
      if (value) return value;
    } catch {
      // Try another candidate.
    }
  }
  return null;
}

function promptFor(input: BrainAnalysisInput): string {
  const compactChecks = input.verification.checks.map((check) => ({
    id: check.id,
    label: check.label,
    status: check.status,
    summary: check.summary,
    source: check.source,
  }));

  const evidence = {
    tokenId: input.tokenId,
    category: input.task.category,
    task: input.task,
    agentOutput: input.output.slice(0, 10_000),
    verification: {
      status: input.verification.status,
      depth: input.verification.depth,
      blockNumber: input.verification.blockNumber,
      blockTimestamp: input.verification.blockTimestamp,
      outputHash: input.verification.outputHash,
      checks: compactChecks,
      boundary: input.verification.boundary,
    },
  };

  return [
    "You are AgentDesk Brain, an evidence analyst for a BNB Chain AI-agent marketplace.",
    "Analyse only the supplied evidence. Never invent balances, APYs, transactions, reputation, pool state, health factors, job completion, latency or proof.",
    "A verified context check supports only the exact fact stated by that check. It does not prove the whole strategy is correct.",
    "If a claim is marked not-verifiable, keep it unresolved. If a check conflicts, surface the conflict prominently.",
    "Do not recommend executing a transaction. This is a read-only pre-hire analysis.",
    "Return ONLY one JSON object with these keys:",
    '{"decision":"LEADING EVIDENCE|MIXED|INSUFFICIENT|CONFLICT","headline":"...","summary":"...","verifiedFacts":["..."],"unresolvedClaims":["..."],"conflicts":["..."],"watchouts":["..."],"nextQuestion":"... or null","boundary":"..."}',
    "Evidence follows:",
    JSON.stringify(evidence),
  ].join("\n\n");
}

export async function analyseWithCamber(input: BrainAnalysisInput): Promise<BrainAnalysis> {
  const agentTag = process.env.CAMBER_BRAIN_AGENT_TAG?.trim();
  if (!agentTag) throw new Error("CAMBER_BRAIN_AGENT_TAG is not configured");

  const response = await chatWithCamber({
    agentId: "agentdesk-brain",
    agentTag,
    message: promptFor(input),
  });
  const parsed = extractJson(response.answer);
  if (!parsed) throw new Error("Camber Brain did not return parseable structured analysis");

  const decisionValue = asString(parsed.decision) as BrainDecision | null;
  const decision = decisionValue && DECISIONS.has(decisionValue) ? decisionValue : "INSUFFICIENT";
  const headline = asString(parsed.headline);
  const summary = asString(parsed.summary);
  if (!headline || !summary) throw new Error("Camber Brain response was missing required analysis fields");

  return {
    provider: "camber",
    providerLabel: "AgentDesk Brain · powered by Camber",
    decision,
    headline,
    summary,
    verifiedFacts: asStrings(parsed.verifiedFacts),
    unresolvedClaims: asStrings(parsed.unresolvedClaims),
    conflicts: asStrings(parsed.conflicts),
    watchouts: asStrings(parsed.watchouts),
    nextQuestion: asString(parsed.nextQuestion),
    boundary: asString(parsed.boundary)
      ?? "Camber explains the supplied AgentDesk evidence but does not create proof or change any verification state.",
    generatedAt: new Date().toISOString(),
    conversationId: response.conversationId,
    model: process.env.CAMBER_BRAIN_MODEL?.trim() || undefined,
  };
}

export function camberBrainEnabled(): boolean {
  return process.env.CAMBER_BRAIN_ENABLED?.trim().toLowerCase() === "true"
    && Boolean(process.env.CAMBER_BRAIN_AGENT_TAG?.trim());
}
