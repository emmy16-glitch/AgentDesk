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

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
}

test("source-backed marketplace renders without legacy claims", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(String(error)));

  await mockDiscovery(page);
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(page.getByText("AgentDesk").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /don't trust the profile/i })).toBeVisible();
  await expect(page.getByText("Mock Venus Monitor")).toBeVisible();
  await expect(page.getByText("Mock DeFi Matrix")).toBeVisible();
  await expect(page.getByText(/Sourced from ERC-8004 \/ 8004scan/)).toBeVisible();

  for (const forbidden of ["12,430", "99.8%", "GridMaster", "RebalanceGuard", "Trust Score"]) {
    await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
  }

  await assertNoHorizontalOverflow(page);

  const ignored = /favicon|walletconnect|wagmi|rpc|websocket|indexeddb/i;
  expect(errors.filter((error) => !ignored.test(error))).toEqual([]);
});

test("all required category controls remain reachable and filtering is evidence-backed", async ({ page }) => {
  await mockDiscovery(page);
  await page.goto("/", { waitUntil: "networkidle" });

  for (const label of [
    "Health Factor Monitoring",
    "Yield Optimisation",
    "Grid Trading",
    "Rebalancing",
  ]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Rebalancing", exact: true }).click();
  await expect(page.getByText("Mock DeFi Matrix")).toBeVisible();
  await expect(page.getByText("Mock Venus Monitor")).toHaveCount(0);

  await page.getByRole("button", { name: "Grid Trading", exact: true }).click();
  await expect(page.getByText("No source-qualified candidates yet")).toBeVisible();

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
  await expect(page.getByText("Live discovery unavailable")).toBeVisible();
  await expect(page.getByText(/will not silently replace failed registry discovery/i)).toBeVisible();
  await expect(page.getByText("GridMaster")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});
