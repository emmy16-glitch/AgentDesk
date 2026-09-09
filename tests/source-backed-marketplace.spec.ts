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
    sourceApi: "https://api.8004scan.io/api/v1",
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
    sourceApi: "https://api.8004scan.io/api/v1",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation", "Rebalancing"],
    categoryEvidence: { "Yield Optimisation": ["yield"], Rebalancing: ["rebalancing"] },
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
    sourceApi: "https://api.8004scan.io/api/v1",
    sourceCheckedAt: "2026-09-08T20:00:00.000Z",
    category: "Yield Optimisation",
    categories: ["Yield Optimisation"],
    categoryEvidence: { "Yield Optimisation": ["yield", "farm"] },
    operationalStatus: "registry-listed",
  },
];

async function mockDiscovery(page: Page) {
  await page.route("**/api/discovery/stream", async (route) => {
    const body = route.request().postDataJSON() as { task: { category: string; guardrails?: { maxPrice?: { amount: string; asset: string }; approvedProtocols?: string[]; actionPolicy?: string } } };
    const summary = {
      runId: "test-discovery-run", category: body.task.category, queryCount: 3, uniqueRegistryMatches: 2,
      qualifiedCandidates: 2, ruleCompatibleCandidates: 2, shortlistedCandidates: 2, completedAuditions: 2,
      startedAt: "2026-09-09T00:00:00.000Z", completedAt: "2026-09-09T00:00:01.000Z", sourceApis: ["https://api.8004scan.io/api/v1"],
    };
    const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
    if (body.task.category !== "Yield Optimisation") {
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: event({ type: "search-started", runId: summary.runId, timestamp: summary.startedAt }) + event({ type: "warning", code: "no-candidates", userMessage: "No matching agents found for this task. Try adjusting your task or rules." }) + event({ type: "done", summary }) });
      return;
    }
    if (body.task.guardrails?.maxPrice) {
      expect(body.task.guardrails).toMatchObject({
        maxPrice: { amount: "0.25", asset: "$U" }, approvedProtocols: ["Venus"], actionPolicy: "approval-required",
      });
    }
    const task = body.task;
    const baseResult = (tokenId: number, output: string, latencyMs: number, quote: { amount: string; asset: string } | null) => ({
      candidate: { chainId: 56, tokenId, registry: "ERC-8004", registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", owner: tokenId === 171927 ? "0x2222222222222222222222222222222222222222" : "0x3333333333333333333333333333333333333333", agentWallet: null, sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}` },
      task, status: "completed", protocol: "A2A", latencyMs, checkedAt: "2026-09-08T22:20:00.000Z", quote,
      output, evidence: [{ kind: "identity", source: "registry", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved identity" }, { kind: "agent-card", source: "card", observedAt: "2026-09-08T22:20:00.000Z", summary: "Resolved A2A card" }, { kind: "service-response", source: "service", observedAt: "2026-09-08T22:20:00.000Z", summary: "Live response" }],
      taskFit: { label: "PARTIAL FIT", reasons: ["Live task-specific response returned."], missingEvidence: ["Economic correctness not independently validated."] },
      ruleEvaluation: body.task.guardrails?.approvedProtocols?.length
        ? { status: "partial", hardFailure: false, passedCount: 2, failedCount: 0, unknownCount: 1, checks: [{ id: "price", label: "Price", status: "pass", summary: "Within the stated limit" }, { id: "risk", label: "Risk", status: "pass", summary: "Matches the stated preference" }, { id: "protocol", label: "Protocol", status: "unknown", summary: "The requested protocol could not be confirmed from this response." }] }
        : { status: "fits", hardFailure: false, passedCount: 2, failedCount: 0, unknownCount: 0, checks: [{ id: "price", label: "Price", status: "pass", summary: "Within the stated limit" }, { id: "risk", label: "Risk", status: "pass", summary: "Matches the stated preference" }] },
      comparison: { rank: tokenId === 171927 ? 1 : 2, label: tokenId === 171927 ? "BEST FIT" : "STRONG FIT", reasons: ["Completed the same live task-specific audition."] },
    });
    const best = baseResult(171927, '{"agentdesk":{"protocol":"Venus","riskLevel":"low","requiresExecution":false}}', 840, { amount: "0.01", asset: "BNB" });
    const other = baseResult(6443, "Proposed a yield-farming route with current market assumptions.", 1220, null);
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        { type: "search-started", runId: summary.runId, timestamp: summary.startedAt },
        { type: "search-complete", matches: 2, registryTotal: null, sourceApis: summary.sourceApis },
        { type: "qualification-started", candidates: 2 }, { type: "qualification-complete", reachable: 2 },
        { type: "rules-applied", suitable: 2 },
        { type: "shortlist-ready", candidates: [discoveredAgents[1], discoveredAgents[2]], summary },
        { type: "audition-started", tokenId: 171927 }, { type: "audition-started", tokenId: 6443 },
        { type: "audition-complete", tokenId: 171927, status: "completed", latencyMs: 840 },
        { type: "audition-complete", tokenId: 6443, status: "completed", latencyMs: 1220 },
        { type: "comparison-started" }, { type: "comparison-ready", results: [best, other], summary }, { type: "done", summary },
      ].map(event).join(""),
    });
  });
}

async function mockAuditions(page: Page) {
  await page.route("**/api/auditions", async (route) => {
    const body = route.request().postDataJSON() as { tokenId: number; task: { category: string; guardrails?: { maxPrice?: { amount: string; asset: string }; approvedProtocols?: string[]; actionPolicy?: string } } };
    expect(body.task.category).toBe("Yield Optimisation");
    expect([171927, 6443]).toContain(body.tokenId);
    if (body.task.guardrails?.maxPrice) {
      expect(body.task.guardrails).toMatchObject({
        maxPrice: { amount: "0.25", asset: "$U" },
        approvedProtocols: ["Venus"],
        actionPolicy: "approval-required",
      });
    }

    const tokenId = body.tokenId;
    const latencyMs = tokenId === 171927 ? 840 : 1220;
    const quote = tokenId === 171927;
    if (tokenId === 6443) await new Promise((resolve) => setTimeout(resolve, 80));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        result: {
          candidate: {
            chainId: 56,
            tokenId,
            registry: "ERC-8004",
            registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
            owner: tokenId === 171927
              ? "0x2222222222222222222222222222222222222222"
              : "0x3333333333333333333333333333333333333333",
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
        },
      }),
    });
  });
}

async function mockBrain(page: Page) {
  await page.route("**/api/brain/analyse", async (route) => {
    const body = route.request().postDataJSON() as { tokenId: number; task: { category: string } };
    expect(body.task.category).toBe("Yield Optimisation");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        tokenId: body.tokenId,
        verification: {
          status: "VERIFIED CONTEXT",
          category: "Yield Optimisation",
          checkedAt: "2026-09-09T00:20:00.000Z",
          blockNumber: "61000000",
          blockTimestamp: "2026-09-09T00:19:59.000Z",
          outputHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          checks: [
            {
              id: "yield-asset",
              label: "Yield asset identity",
              status: "verified",
              summary: "USDC resolves to the canonical BNB token contract.",
              source: "BNB Chain token 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
              observedAt: "2026-09-09T00:20:00.000Z",
            },
            {
              id: "yield-economic-claim",
              label: "Yield/APY claim",
              status: "not-verifiable",
              summary: "APY remains unverified without a reproduced protocol rate source.",
              source: "AgentDesk evidence boundary",
              observedAt: "2026-09-09T00:20:00.000Z",
            },
          ],
          depth: {
            verdict: "MIXED EVIDENCE",
            title: "Yield route evidence",
            scenarioLabel: "Scenario capital only — pool context can be checked without depositing funds",
            verifiedCount: 1,
            conflictCount: 0,
            unresolvedCount: 1,
            errorCount: 0,
            machineReadableClaims: false,
            highlights: ["USDC resolves to the canonical BNB token contract."],
          },
          boundary: "Independent checks verify only reproducible BNB facts and deterministic scenario math.",
        },
        analysis: {
          decision: "MIXED",
          headline: "The route has live token context, but the yield claim is still unresolved.",
          summary: "AgentDesk reproduced the token identity while preserving the APY as unverified.",
          verifiedFacts: ["USDC resolves to the canonical BNB token contract."],
          unresolvedClaims: ["APY remains unverified without a reproduced protocol rate source."],
          conflicts: [],
          watchouts: ["Pool existence does not prove future returns."],
          nextQuestion: "Can the agent provide a machine-readable protocol rate source?",
          boundary: "AgentDesk Brain explains the supplied evidence but does not create proof.",
          generatedAt: "2026-09-09T00:20:01.000Z",
        },
      }),
    });
  });
}

async function openYieldCandidates(page: Page) {
  await page.getByLabel("What do you want an agent to do?").fill("Help me find a yield option for 500 USDC");
  await page.getByRole("button", { name: /Find the best agent/i }).click();
  await expect(page.getByRole("heading", { name: "Tell us a little more." })).toBeVisible();
}

async function runYieldAudition(page: Page) {
  await openYieldCandidates(page);
  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByRole("heading", { name: "Mock DeFi Matrix" })).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
}

test("guided marketplace is focused and legacy homepage clutter is gone", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(String(error)));

  await mockDiscovery(page);
  const response = await page.goto("/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: /What do you want an agent to do/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Protect" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Earn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Trade" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Balance" })).toBeVisible();
  await expect(page.getByText("Prototype Wallet", { exact: true })).toHaveCount(0);
  await expect(page.getByText("HealthGuard AI", { exact: true })).toHaveCount(0);
  await expect(page.getByText("AI Assistant", { exact: true })).toHaveCount(0);

  for (const forbidden of ["12,430", "99.8%", "GridMaster", "RebalanceGuard", "Trust Score"]) {
    await expect(page.getByText(forbidden, { exact: false })).toHaveCount(0);
  }

  await assertNoHorizontalOverflow(page);
  const ignored = /favicon|walletconnect|wagmi|rpc|websocket|indexeddb/i;
  expect(errors.filter((error) => !ignored.test(error))).toEqual([]);
});

test("task categories guide users to only matching registry candidates", async ({ page }) => {
  await mockDiscovery(page);
  await mockAuditions(page);
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Earn" }).click();
  await page.getByLabel("What do you want an agent to do?").fill("Find an option for 500 USDC");
  await page.getByRole("button", { name: /Find the best agent/i }).click();
  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByRole("heading", { name: "Mock DeFi Matrix" })).toBeVisible();
  await expect(page.getByText("Mock Venus Monitor")).toHaveCount(0);

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Trade" }).click();
  await page.getByRole("button", { name: /Find the best agent/i }).click();
  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByText(/No matching agents found for this task/i)).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("live audition remains blind and shows one clear best result", async ({ page }) => {
  await mockDiscovery(page);
  await mockAuditions(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await runYieldAudition(page);

  await expect(page.getByText("Mock DeFi Matrix", { exact: true })).toBeVisible();
  await expect(page.getByText("0.01 BNB", { exact: true })).toBeVisible();
  await expect(page.getByText("Trust Score", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/The agent that performed best for your task/i)).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("verification and AgentDesk Brain stay behind an explicit verify action", async ({ page }) => {
  await mockDiscovery(page);
  await mockAuditions(page);
  await mockBrain(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await runYieldAudition(page);

  await page.getByRole("button", { name: /Check answer/i }).first().click();
  const depth = page.getByLabel("Yield Optimisation depth analysis").first();
  await expect(depth).toBeVisible();
  await depth.getByRole("button", { name: /Verify with live checks \+ Brain/i }).click();

  await expect(depth.getByText("MIXED EVIDENCE", { exact: true })).toBeVisible();
  await expect(depth.getByText("AgentDesk’s take", { exact: true })).toBeVisible();
  await expect(depth.getByText(/Camber/i)).toHaveCount(0);
  await expect(depth.getByText(/APY remains unverified/i).first()).toBeVisible();
  await depth.getByText("Review reasoning details", { exact: true }).click();
  await expect(depth.getByText(/does not create proof/i).first()).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("Your rules stay compact until edited and persist through the guided flow", async ({ page }) => {
  await mockDiscovery(page);
  await mockAuditions(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await openYieldCandidates(page);

  const rules = page.getByLabel("Your rules");
  await expect(rules.getByText("Moderate risk", { exact: true })).toBeVisible();
  await expect(rules.getByText(/Any protocol · Ask me before any action/, { exact: true })).toBeVisible();
  await expect(rules.getByLabel("Risk preference")).toHaveCount(0);
  await rules.getByRole("button", { name: "Edit" }).click();
  await rules.getByRole("radio", { name: "Limit to a protocol" }).click();
  await rules.getByLabel("Allowed protocol").fill("Venus");
  await rules.getByLabel("Maximum hire price amount").fill("0.25");
  await rules.getByRole("button", { name: "Done" }).click();
  await expect(rules.getByText("Moderate risk · Max 0.25 $U", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByRole("heading", { name: "Mock DeFi Matrix" })).toBeVisible();
  await expect(page.getByText("Fits what we could confirm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Check answer/i }).first().click();
  await expect(page.getByText("Your rules", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Continue to hire/i }).click();
  await expect(page.getByText("These are the rules this agent was tested against.", { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("discovery failure stays truthful and never invents agents", async ({ page }) => {
  await page.route("**/api/discovery/stream", async (route) => {
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "upstream unavailable", fallback: null }),
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("What do you want an agent to do?").fill("Help me find yield");
  await page.getByRole("button", { name: /Find the best agent/i }).click();
  await page.getByRole("button", { name: /^Find agents/i }).click();
  await expect(page.getByText(/trouble searching the registry right now/i)).toBeVisible();
  await expect(page.getByText("GridMaster")).toHaveCount(0);
  await expect(page.getByText("RebalanceGuard")).toHaveCount(0);
  await assertNoHorizontalOverflow(page);
});
