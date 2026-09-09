import { expect, test } from "@playwright/test";
import { compareAuditions } from "@/lib/auditions/compare";
import type { AuditionResult, AuditionTask } from "@/lib/auditions/types";
import type { OnChainAgentIdentity } from "@/lib/erc8004-registry";
import { mapWithConcurrency } from "@/lib/discovery/concurrency";
import { dedupeRegistryCandidates, DISCOVERY_LIMITS, runDiscoveryStream } from "@/lib/discovery/orchestration";
import { planDiscoveryQueries } from "@/lib/discovery/query-plan";
import { encodeSseEvent, parseSseFrames } from "@/lib/discovery/sse";
import type { DiscoveredAgent } from "@/lib/8004scan";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

const task: AuditionTask = {
  category: "Yield Optimisation",
  asset: "USDC",
  amount: "500",
  riskPreference: "moderate",
  instructions: "Find a low complexity yield route",
  guardrails: { riskTolerance: "moderate", approvedProtocols: [], actionPolicy: "approval-required", dataPolicy: "task-only" },
};

function agent(tokenId: number): DiscoveredAgent {
  return {
    registry: "ERC-8004", chainId: 56, tokenId, agentId: `56:${tokenId}`,
    name: `Yield agent ${tokenId}`, description: "BNB Chain USDC yield optimisation and lending vaults.",
    ownerAddress: null, protocols: ["A2A"], sourceScore: null, feedbackCount: null, starCount: null,
    registeredAt: null, sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}`, source: "8004scan",
    sourceApi: "https://api.8004scan.io/api/v1", sourceCheckedAt: "2026-09-09T00:00:00.000Z",
    category: "Yield Optimisation", categories: ["Yield Optimisation"],
    categoryEvidence: { "Yield Optimisation": ["yield", "vault"] }, operationalStatus: "registry-listed",
  };
}

function result(tokenId: number, auditionTask: AuditionTask): AuditionResult {
  return {
    candidate: { chainId: 56, tokenId, registry: "ERC-8004", registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", owner: "0x1111111111111111111111111111111111111111", agentWallet: null, sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}` },
    task: auditionTask, status: "completed", protocol: "A2A", latencyMs: tokenId === 2 ? 20 : 40,
    checkedAt: "2026-09-09T00:00:00.000Z", quote: { amount: "0.01", asset: "$U" },
    output: '{"agentdesk":{"riskLevel":"low","requiresExecution":false}}', evidence: [],
    taskFit: { label: "PARTIAL FIT", reasons: [], missingEvidence: [] },
  };
}

test("task-aware query plans stay bounded and reflect the selected category", () => {
  const queries = planDiscoveryQueries(task);
  expect(queries).toHaveLength(3);
  expect(queries.length).toBeLessThanOrEqual(6);
  expect(queries.join(" ").toLowerCase()).toContain("usdc");
  expect(queries.join(" ").toLowerCase()).toContain("yield");
});

test("registry candidates dedupe by stable chain and token identity", () => {
  expect(dedupeRegistryCandidates([agent(1), agent(2), agent(1)])).toHaveLength(2);
});

test("qualification helper never exceeds its configured concurrency", async () => {
  let active = 0;
  let maximum = 0;
  const values = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 8));
    active -= 1;
    return value * 2;
  });
  expect(maximum).toBeLessThanOrEqual(3);
  expect(values).toEqual([2, 4, 6, 8, 10, 12, 14]);
});

test("discovery streams ordered, deduplicated live stages and preserves partial results", async () => {
  const events = [] as string[];
  const stream = runDiscoveryStream({ task }, {
    search: async () => ({ agents: [agent(1), agent(2), agent(1)], sourceApi: "https://api.8004scan.io/api/v1" }),
    qualify: async (candidates) => candidates.map((candidate) => ({ agent: candidate, identity: {} as OnChainAgentIdentity, endpointReachable: true })),
    audition: async ({ tokenId, task: auditionTask }) => result(tokenId, auditionTask),
    compare: compareAuditions,
  });
  let completed = 0;
  for await (const event of stream) {
    events.push(event.type);
    if (event.type === "audition-complete" && event.status === "completed") completed += 1;
  }
  expect(events).toEqual([
    "search-started", "search-complete", "qualification-started", "qualification-complete", "rules-applied",
    "shortlist-ready", "audition-started", "audition-started", "audition-complete", "audition-complete",
    "comparison-started", "comparison-ready", "done",
  ]);
  expect(completed).toBe(2);
  expect(DISCOVERY_LIMITS).toEqual({ registryCandidates: 24, qualifiedCandidates: 16, auditionFinalists: 4 });
});

test("SSE parser safely carries incomplete frames into the next stream chunk", () => {
  const frame = encodeSseEvent({ type: "search-started", runId: "run-1", timestamp: "2026-09-09T00:00:00.000Z" });
  const first = parseSseFrames(frame.slice(0, 14));
  expect(first.events).toEqual([]);
  const second = parseSseFrames(first.remainder + frame.slice(14));
  expect(second.events).toHaveLength(1);
  expect(second.events[0]?.type).toBe("search-started");
});

test("endpoint validation rejects local, credentialed, templated, and non-standard URLs", async () => {
  await expect(validatePublicHttpsUrl("https://127.0.0.1/a2a")).resolves.toMatchObject({ ok: false });
  await expect(validatePublicHttpsUrl("https://user:pass@example.com/a2a")).resolves.toMatchObject({ ok: false });
  await expect(validatePublicHttpsUrl("https://example.com:8443/a2a")).resolves.toMatchObject({ ok: false });
  await expect(validatePublicHttpsUrl("https://example.com/agents/{agentId}")).resolves.toMatchObject({ ok: false });
});
