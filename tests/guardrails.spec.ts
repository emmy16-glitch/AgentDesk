import { expect, test } from "@playwright/test";
import { compareAuditions } from "@/lib/auditions/compare";
import { buildAuditionReceipt } from "@/lib/auditions/receipt";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import { parseAuditionTask } from "@/lib/auditions/validation";
import { evaluateTaskGuardrails } from "@/lib/guardrails/evaluate";
import type { TaskGuardrails } from "@/lib/guardrails/types";

const guardrails: TaskGuardrails = {
  riskTolerance: "moderate",
  maxPrice: { amount: "0.25", asset: "$U" },
  approvedProtocols: ["Venus"],
  actionPolicy: "approval-required",
  dataPolicy: "task-only",
};

function task(overrides: Partial<AuditionTask> = {}): AuditionTask {
  return { category: "Yield Optimisation", asset: "USDC", amount: "500", riskPreference: "moderate", guardrails, ...overrides } as AuditionTask;
}

function result(overrides: Partial<AuditionResult> = {}): AuditionResult {
  return {
    candidate: { chainId: 56, tokenId: 302258, registry: "ERC-8004", registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", owner: "0x1111111111111111111111111111111111111111", agentWallet: null, sourceUrl: "https://8004scan.io/agents/bsc/302258" },
    task: task(), status: "completed", protocol: "A2A", latencyMs: 100, checkedAt: "2026-09-09T00:00:00.000Z",
    quote: { amount: "0.10", asset: "$U" },
    output: '{"agentdesk":{"protocol":"Venus","riskLevel":"low","requiresExecution":false}}',
    evidence: [], taskFit: { label: "PARTIAL FIT", reasons: [], missingEvidence: [] },
    ...overrides,
  };
}

test("no guardrails preserves backwards-compatible evaluation", () => {
  const evaluation = evaluateTaskGuardrails(result({ task: task({ guardrails: undefined }) }));
  expect(evaluation).toMatchObject({ status: "fits", hardFailure: false, passedCount: 0, failedCount: 0, unknownCount: 0 });
});

test("price, protocol and risk are only passed with matching evidence", () => {
  const evaluation = evaluateTaskGuardrails(result());
  expect(evaluation.status).toBe("fits");
  expect(evaluation.checks.find((check) => check.id === "price")?.status).toBe("pass");
  expect(evaluation.checks.find((check) => check.id === "protocol")?.status).toBe("pass");
  expect(evaluation.checks.find((check) => check.id === "risk")?.status).toBe("pass");
});

test("a known price over the limit is a hard conflict", () => {
  const evaluation = evaluateTaskGuardrails(result({ quote: { amount: "0.50", asset: "$U" } }));
  expect(evaluation).toMatchObject({ status: "conflict", hardFailure: true });
  expect(evaluation.checks.find((check) => check.id === "price")?.status).toBe("fail");
});

test("missing price and protocol evidence stay unknown, not pass", () => {
  const evaluation = evaluateTaskGuardrails(result({ quote: null, output: "A short prose response without machine-readable claims." }));
  expect(evaluation.status).toBe("partial");
  expect(evaluation.checks.find((check) => check.id === "price")?.status).toBe("unknown");
  expect(evaluation.checks.find((check) => check.id === "protocol")?.status).toBe("unknown");
});

test("a protocol outside the allowlist is a hard conflict", () => {
  const evaluation = evaluateTaskGuardrails(result({ output: '{"agentdesk":{"protocol":"PancakeSwap","riskLevel":"low","requiresExecution":false}}' }));
  expect(evaluation).toMatchObject({ status: "conflict", hardFailure: true });
  expect(evaluation.checks.find((check) => check.id === "protocol")?.status).toBe("fail");
});

test("an empty allowlist means any protocol", () => {
  const flexible = { ...guardrails, approvedProtocols: [] };
  const evaluation = evaluateTaskGuardrails(result({ task: task({ guardrails: flexible }) }));
  expect(evaluation.checks.find((check) => check.id === "protocol")).toBeUndefined();
});

test("comparison cannot choose a hard-rule conflict as best fit", () => {
  const overLimit = result({ candidate: { ...result().candidate, tokenId: 1 }, quote: { amount: "0.50", asset: "$U" }, latencyMs: 10 });
  const eligible = result({ candidate: { ...result().candidate, tokenId: 2 }, quote: { amount: "0.10", asset: "$U" }, latencyMs: 999 });
  const compared = compareAuditions([overLimit, eligible], guardrails);
  expect(compared[0].candidate.tokenId).toBe(2);
  expect(compared[0].comparison.label).toBe("BEST FIT");
  expect(compared[1].ruleEvaluation.hardFailure).toBe(true);
});

test("all hard conflicts leave no eligible candidate", () => {
  const first = result({ candidate: { ...result().candidate, tokenId: 1 }, quote: { amount: "0.50", asset: "$U" } });
  const second = result({ candidate: { ...result().candidate, tokenId: 2 }, output: '{"agentdesk":{"protocol":"PancakeSwap"}}' });
  const compared = compareAuditions([first, second], guardrails);
  expect(compared.every((entry) => entry.ruleEvaluation.hardFailure)).toBe(true);
  expect(compared.find((entry) => !entry.ruleEvaluation.hardFailure)).toBeUndefined();
});

test("receipt task hashes bind deterministic guardrails without breaking old tasks", () => {
  const receipt = buildAuditionReceipt(compareAuditions([result()], guardrails)[0]);
  const same = buildAuditionReceipt(compareAuditions([result()], guardrails)[0]);
  const changed = buildAuditionReceipt(compareAuditions([result({ task: task({ guardrails: { ...guardrails, maxPrice: { amount: "0.30", asset: "$U" } } }) })])[0]);
  expect(receipt.taskHash).toBe(same.taskHash);
  expect(receipt.taskHash).not.toBe(changed.taskHash);
  expect(parseAuditionTask({ category: "Yield Optimisation", asset: "USDC", amount: "500" })).not.toBeNull();
});
