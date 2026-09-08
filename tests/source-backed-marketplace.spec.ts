import { expect, test, type Page } from "@playwright/test";

const discoveredAgents = [
  {
    registry: "ERC-8004",
    chainId: 56,
    tokenId: 43129,
    agentId: "56:43129",
    name: "Mock Venus Monitor",
    description: "Monitors lending health factor and liquidation risk on BNB Chain.",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    protocols: ["MCP"],
    sourceScore: 87,
    feedbackCount: 12,
    starCount: 4,
    registeredAt: "2026-09-01T00:00:00.000Z",
    sourceUrl: "https://8004scan.io/agents/bsc/43129",
    source: "8004scan",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Health Factor Monitoring",
    categories: ["Health Factor Monitoring"],
    categoryEvidence: { "Health Factor Monitoring": ["health factor", "liquidation"] },
    operationalStatus: "registry-listed",
  },
  {
    registry: "ERC-8004",
    chainId: 56,
    tokenId: 171927,
    agentId: "56:171927",
    name: "Mock DeFi Matrix",
    description: "Provides yield strategies and portfolio rebalancing recommendations.",
    ownerAddress: "0x2222222222222222222222222222222222222222",
    protocols: ["A2A"],
    sourceScore: 74,
    feedbackCount: 8,
    starCount: 2,
    registeredAt: "2026-09-02T00:00:00.000Z",
    sourceUrl: "https://8004scan.io/agents/bsc/171927",
    source: "8004scan",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation", "Rebalancing"],
    categoryEvidence: {
      "Yield Optimisation": ["yield"],
      Rebalancing: ["rebalancing"],
    },
    operationalStatus: "registry-listed",
  },
  {
    registry: "ERC-8004",
    chainId: 56,
    tokenId: 6443,
    agentId: "56:6443",
    name: "Mock Yield Runner",
    description: "Optimises DeFi yield and farming positions with current market analysis.",
    ownerAddress: "0x3333333333333333333333333333333333333333",
    protocols: ["A2A", "Web"],
    sourceScore: 69,
    feedbackCount: 3,
    starCount: 1,
    registeredAt: "2026-09-03T00:00:00.000Z",
    sourceUrl: "https://8004scan.io/agents/bsc/6443",
    source: "8004scan",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation"],
    categoryEvidence: { "Yield Optimisation": ["yield", "farm"] },
    operationalStatus: "registry-listed",
  },
];

async function mockDiscovery(page: Page) {
  await page.route("**/api/agents", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        source: "8004scan",
        chainId: 56,
        provenance: { checkedAt: "2026-09-08T20:00:00.000Z" },
        agents: discoveredAgents,
      }),
    });
  });
}

async function mockAuditions(page: Page) {
  await page.route("**/api/auditions", async (route) => {
    const body = route.request().postDataJSON() as { tokenId: number; task: { category: string } };
    expect(body.task.category).toBe("Yield Optimisation");
    expect([171927, 6443]).toContain(body.tokenId);

    const tokenId = body.tokenId;
    const latencyMs = tokenId === 171927 ? 840 : 1220;
    const quote = tokenId === 171927;
    const result = {
      candidate: {
        chainId: 56,
        tokenId,
        registry: "ERC-8004",
        registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
        owner: tokenId === 171927 ? "0x2222222222222222222222222222222222222222" : "0x3333333333333333333333333333333333333333",
        agentWallet: null,
        sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}`,
      },
      task: body.task,
      status: "completed",
      protocol: "A2A",
      latencyMs,
      checkedAt: "2026-09-08T22:20:00.000Z",
      quote: quote ? { amount: "0.01", asset: "BNB", source: "A2A response metadata" } : null,
      output: tokenId === 171927
        ? "Proposed a diversified BNB Chain yield route with explicit assumptions and current evidence."
        : "Proposed a yield-farming route with current market assumptions.",
      evidence: [
        { kind: "identity", source: "registry", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved identity" },
        { kind: "agent-card", source: "card", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved A2A card" },
        { kind: "service-response", source: "service", observedAt: "2026-09-08T22:20:00.000Z", summary: "Live response" },
      ],
      taskFit: {
        label: "PARTIAL FIT",
        reasons: ["Live task-specific response returned."],
        missingEvidence: ["Economic correctness not independently validated."],
      },
    };

    if (tokenId === 6443) await new Promise((resolve) => setTimeout(resolve, 80));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, result }),
    });
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
}

test("task-first source-backed marketplace renders without legacy claims", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(String(error)));

  await mockDiscovery(page);
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(page.getByText("AgentDesk").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /don't trust the profile/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What do you want an agent to do?" })).toBeVisible();
  await expect(page.getByText("Mock DeFi Matrix").first()).toBeVisible();
  await expect(page.getByText("Mock Yield Runner").first()).toBeVisible();
  await expect(page.getByText(/Sourced from ERC-8004 \/ 8004scan/)).toBeVisible();

  for (const forbidden of ["12,430", "99.8%", "GridMaster", "RebalanceGuard", "Trust Score"]) {
    await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
  }

  await assertNoHorizontalOverflow(page);

  const ignored = /favicon|walletconnect|wagmi|rpc|websocket|indexeddb/i;
  expect(errors.filter((error) => !ignored.test(error))).toEqual([]);
});

test("all task families remain reachable and candidate selection is evidence-backed", async ({ page }) => {
  await mockDiscovery(page);
  await page.goto("/", { waitUntil: "networkidle" });

  const workbench = page.locator("#audition");
  const taskTabs = workbench.getByLabel("Task family");
  for (const label of [
    "Health Factor Monitoring",
    "Yield Optimisation",
    "Grid Trading",
    "Rebalancing",
  ]) {
    await expect(taskTabs.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await taskTabs.getByRole("button", { name: "Rebalancing", exact: true }).click();
  await expect(workbench.getByText("Mock DeFi Matrix").first()).toBeVisible();
  await expect(workbench.getByText("Mock Venus Monitor")).toHaveCount(0);

  await taskTabs.getByRole("button", { name: "Grid Trading", exact: true }).click();
  await expect(workbench.getByText(/No source-qualified candidates currently match this task family/i)).toBeVisible();

  await assertNoHorizontalOverflow(page);
});

test("two live auditions race, stay blind, and produce a transparent comparison", async ({ page }) => {
  await mockDiscovery(page);
  await mockAuditions(page);
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.getByText("2/4 selected")).toBeVisible();
  await page.getByRole("button", { name: "Run live auditions (2)" }).click();

  const race = page.getByLabel("Live audition race");
  await expect(race).toBeVisible();
  await expect(race.getByText("Candidate A")).toBeVisible();
  await expect(race.getByText("Candidate B")).toBeVisible();
  await expect(race.getByText(/2\/2 finished/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Who proved the best fit?" })).toBeVisible();
  await expect(page.getByText("BEST FIT", { exact: true })).toBeVisible();
  await expect(page.getByText("STRONG FIT", { exact: true })).toBeVisible();
  await expect(page.getByText("840 ms", { exact: true })).toBeVisible();
  await expect(page.getByText("0.01 BNB", { exact: true })).toBeVisible();
  await expect(page.getByText(/Blind audition mode is on/i)).toBeVisible();
  await expect(page.getByText(/No global trust percentage is used/i)).toBeVisible();
  await expect(page.getByText("Trust Score", { exact: true })).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});

test("discovery failure never falls back to fabricated agents", async ({ page }) => {
  await page.route("**/api/agents", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "upstream unavailable", fallback: null }),
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Live discovery unavailable", { exact: true }).last()).toBeVisible();
  await expect(page.getByText(/will not silently replace failed registry discovery/i)).toBeVisible();
  await expect(page.getByText("GridMaster")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});
