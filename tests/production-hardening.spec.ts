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
  await page.route("**/api/agents", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        source: "8004scan",
        chainId: 56,
        provenance: { checkedAt: "2026-09-08T20:00:00.000Z" },
        agents: yieldAgents,
      }),
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
  await page.route("**/api/auditions", async (route) => {
    const request = route.request().postDataJSON() as { tokenId: number; task: Record<string, unknown> };
    const completed = request.tokenId === 171927;
    const result = {
      candidate: {
        chainId: 56,
        tokenId: request.tokenId,
        registry: "ERC-8004",
        registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
        owner: completed ? "0x2222222222222222222222222222222222222222" : "0x3333333333333333333333333333333333333333",
        agentWallet: null,
        sourceUrl: `https://8004scan.io/agents/bsc/${request.tokenId}`,
      },
      task: request.task,
      status: completed ? "completed" : "timeout",
      protocol: "A2A",
      latencyMs: completed ? 620 : 12000,
      checkedAt: "2026-09-08T22:20:00.000Z",
      quote: completed ? { amount: "0.02", asset: "$U", source: "live response" } : null,
      output: completed ? "Returned a task-specific yield route with assumptions and evidence." : null,
      evidence: completed
        ? [
            { kind: "identity", source: "registry", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved identity" },
            { kind: "agent-card", source: "card", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved A2A card" },
            { kind: "service-response", source: "service", observedAt: "2026-09-08T22:20:00.000Z", summary: "Live response" },
          ]
        : [
            { kind: "identity", source: "registry", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved identity" },
            { kind: "agent-card", source: "card", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved A2A card before timeout" },
          ],
      error: completed ? undefined : "A2A service timed out before returning task-specific output.",
      taskFit: completed
        ? { label: "PARTIAL FIT", reasons: ["Live task-specific response returned."], missingEvidence: ["Economic correctness not independently validated."] }
        : { label: "NOT ENOUGH EVIDENCE", reasons: ["The live service timed out."], missingEvidence: ["No task-specific output was returned."] },
    };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, result }) });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Find matching agents/i }).click();
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Run auditions/i }).click();

  await expect(page.getByRole("heading", { name: "Who proved the best fit?" })).toBeVisible();

  const best = page.locator(".clean-best-card");
  await expect(best.getByText("BEST FIT", { exact: true })).toBeVisible();
  await expect(best.getByText("Completed", { exact: true })).toBeVisible();
  await expect(best.getByText("Returned a task-specific yield route", { exact: false })).toBeVisible();

  const timedOut = page.locator(".clean-result-row").filter({ hasText: "Timed out" });
  await expect(timedOut).toBeVisible();
  await expect(timedOut.getByText("NOT ENOUGH EVIDENCE", { exact: true })).toBeVisible();
  await expect(timedOut.getByText("Timed out", { exact: true })).toBeVisible();

  await timedOut.getByRole("button").click();
  await expect(timedOut.getByText(/A2A service timed out before returning task-specific output/i)).toBeVisible();
});