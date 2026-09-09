import { expect, test, type Page } from "@playwright/test";

const yieldAgents = [
  {
    registry: "ERC-8004",
    chainId: 56,
    tokenId: 171927,
    agentId: "56:171927",
    name: "Yield Candidate One",
    description: "Source-backed yield optimisation candidate.",
    ownerAddress: "0x2222222222222222222222222222222222222222",
    protocols: ["A2A"],
    sourceScore: 1,
    feedbackCount: 0,
    starCount: 0,
    registeredAt: "2026-09-01T00:00:00.000Z",
    sourceUrl: "https://8004scan.io/agents/bsc/171927",
    source: "8004scan",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation"],
    categoryEvidence: { "Yield Optimisation": ["yield"] },
    operationalStatus: "registry-listed",
  },
  {
    registry: "ERC-8004",
    chainId: 56,
    tokenId: 6443,
    agentId: "56:6443",
    name: "Yield Candidate Two",
    description: "Second source-backed yield optimisation candidate.",
    ownerAddress: "0x3333333333333333333333333333333333333333",
    protocols: ["A2A"],
    sourceScore: 1,
    feedbackCount: 0,
    starCount: 0,
    registeredAt: "2026-09-01T00:00:00.000Z",
    sourceUrl: "https://8004scan.io/agents/bsc/6443",
    source: "8004scan",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation"],
    categoryEvidence: { "Yield Optimisation": ["yield"] },
    operationalStatus: "registry-listed",
  },
];

async function mockYieldDiscovery(page: Page) {
  await page.route("**/api/discovery/stream", async (route) => {
    const request = route.request().postDataJSON() as { task: Record<string, unknown> & { category: string } };
    const summary = { runId: "timeout-regression", category: request.task.category, queryCount: 3, uniqueRegistryMatches: 2, qualifiedCandidates: 2, ruleCompatibleCandidates: 2, shortlistedCandidates: 2, completedAuditions: 1, startedAt: "2026-09-08T22:20:00.000Z", completedAt: "2026-09-08T22:20:01.000Z", sourceApis: ["https://api.8004scan.io/api/v1"] };
    const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
    const result = (tokenId: number, status: "completed" | "timeout") => ({
      candidate: { chainId: 56, tokenId, registry: "ERC-8004", registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", owner: tokenId === 171927 ? "0x2222222222222222222222222222222222222222" : "0x3333333333333333333333333333333333333333", agentWallet: null, sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}` },
      task: request.task, status, protocol: "A2A", latencyMs: status === "completed" ? 620 : 12000, checkedAt: "2026-09-08T22:20:00.000Z",
      quote: status === "completed" ? { amount: "0.02", asset: "$U", source: "live response" } : null,
      output: status === "completed" ? "Returned a task-specific yield route with assumptions and evidence." : null,
      evidence: [{ kind: "identity", source: "registry", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved identity" }, { kind: "agent-card", source: "card", observedAt: "2026-09-08T22:20:00.000Z", summary: status === "completed" ? "Resolved A2A card" : "Resolved A2A card before timeout" }],
      taskFit: status === "completed" ? { label: "PARTIAL FIT", reasons: ["Live task-specific response returned."], missingEvidence: ["Economic correctness not independently validated."] } : { label: "NOT ENOUGH EVIDENCE", reasons: ["The live service timed out."], missingEvidence: ["No task-specific output was returned."] },
      ruleEvaluation: { status: "partial", hardFailure: false, passedCount: 0, failedCount: 0, unknownCount: 1, checks: [{ id: "risk", label: "Risk level", status: "unknown", summary: "Risk level couldn’t be confirmed." }] },
      comparison: { rank: tokenId === 171927 ? 1 : 2, label: tokenId === 171927 ? "BEST FIT" : "NOT ENOUGH EVIDENCE", reasons: ["Live audition evidence only."] },
    });
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        { type: "search-started", runId: summary.runId, timestamp: summary.startedAt }, { type: "search-complete", matches: 2, registryTotal: null, sourceApis: summary.sourceApis },
        { type: "qualification-started", candidates: 2 }, { type: "qualification-complete", reachable: 2 }, { type: "rules-applied", suitable: 2 },
        { type: "shortlist-ready", candidates: yieldAgents, summary }, { type: "audition-started", tokenId: 171927 }, { type: "audition-started", tokenId: 6443 },
        { type: "audition-complete", tokenId: 171927, status: "completed", latencyMs: 620 }, { type: "audition-complete", tokenId: 6443, status: "timeout", latencyMs: 12000, userMessage: "Took too long" },
        { type: "comparison-started" }, { type: "comparison-ready", results: [result(171927, "completed"), result(6443, "timeout")], summary }, { type: "done", summary },
      ].map(event).join(""),
    });
  });
}

test("production shell exposes bounded liveness and security headers", async ({ request }) => {
  const health = await request.get("/api/health/");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toContain("no-store");
  expect(health.headers()["x-agentdesk-proof-boundary"]).toBe("liveness-only");
  const healthBody = await health.json() as Record<string, unknown>;
  expect(healthBody.ok).toBe(true);
  expect(healthBody.status).toBe("alive");
  expect(String(healthBody.proofBoundary)).toContain("Liveness only");

  const home = await request.get("/");
  expect(home.status()).toBe(200);
  const headers = home.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("manifest is production-readable without inventing a deployment URL", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const body = await response.json() as Record<string, unknown>;
  expect(body.name).toBe("AgentDesk");
  expect(body.start_url).toBe("/");
  expect(body.display).toBe("standalone");
});

test("a timed-out candidate remains visible but can never outrank a completed audition", async ({ page }) => {
  await mockYieldDiscovery(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("What do you want an agent to do?").fill("Find a yield route");
  await page.getByRole("button", { name: /Find the best agent/i }).click();
  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByRole("heading", { name: "Yield Candidate One" })).toBeVisible();
  await expect(page.getByText("Returned a task-specific yield route", { exact: false })).toBeVisible();

  const timedOut = page.locator(".ad-agent-row").filter({ hasText: "Yield Candidate Two" });
  await expect(timedOut).toBeVisible();
  await expect(timedOut.getByText("Couldn’t finish", { exact: true })).toBeVisible();
});
