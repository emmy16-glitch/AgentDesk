import { expect, test } from "@playwright/test";
import { parseStructuredAuditionClaims } from "@/lib/auditions/structured-output";
import { buildEvidenceEngineAnalysis } from "@/lib/brain/evidence-engine";
import type { BrainAnalysisInput } from "@/lib/brain/types";
import type { AuditionTask } from "@/lib/auditions/types";
import type { IndependentVerification } from "@/lib/auditions/verification-types";

const cases: Array<{
  category: AuditionTask["category"];
  output: string;
  assert: (value: ReturnType<typeof parseStructuredAuditionClaims>) => void;
}> = [
  {
    category: "Health Factor Monitoring",
    output: 'Evidence summary.\n```json\n{"agentdesk":{"protocol":"Venus","healthFactor":1.42,"shortfall":0,"liquidationRisk":"low"}}\n```',
    assert: (value) => {
      expect(value.health?.protocol).toBe("Venus");
      expect(value.health?.healthFactor).toBe(1.42);
      expect(value.health?.shortfall).toBe(0);
    },
  },
  {
    category: "Yield Optimisation",
    output: '{"agentdesk":{"protocol":"PancakeSwap","pair":"USDC/WBNB","poolAddress":"0x1111111111111111111111111111111111111111","estimatedApyPct":"12.5%"}}',
    assert: (value) => {
      expect(value.yield?.pair).toBe("USDC/WBNB");
      expect(value.yield?.estimatedApyPct).toBe(12.5);
    },
  },
  {
    category: "Grid Trading",
    output: '{"agentdesk":{"venue":"PancakeSwap V3","pair":"WBNB/USDT","lowerPrice":520,"upperPrice":640,"gridCount":20,"feeTier":500}}',
    assert: (value) => {
      expect(value.grid?.lowerPrice).toBe(520);
      expect(value.grid?.upperPrice).toBe(640);
      expect(value.grid?.gridCount).toBe(20);
      expect(value.grid?.feeTier).toBe(500);
    },
  },
  {
    category: "Rebalancing",
    output: '{"agentdesk":{"targetAllocations":{"BNB":60,"USDT":"25%","USDC":15}}}',
    assert: (value) => {
      expect(value.rebalance?.targetAllocations).toEqual({ BNB: 60, USDT: 25, USDC: 15 });
    },
  },
];

for (const example of cases) {
  test(`parses ${example.category} machine-readable claims without prose inference`, () => {
    const parsed = parseStructuredAuditionClaims(example.output, example.category);
    expect(parsed.detected).toBe(true);
    expect(parsed.raw).not.toBeNull();
    example.assert(parsed);
  });
}

test("prose-only output stays prose-only instead of manufacturing numerical claims", () => {
  const parsed = parseStructuredAuditionClaims(
    "I would use a 20-level grid between roughly five hundred and six hundred dollars.",
    "Grid Trading",
  );
  expect(parsed.detected).toBe(false);
  expect(parsed.grid).toBeUndefined();
});

function verification(overrides: Partial<IndependentVerification> = {}): IndependentVerification {
  return {
    status: "VERIFIED CONTEXT",
    category: "Yield Optimisation",
    checkedAt: "2026-09-09T00:00:00.000Z",
    blockNumber: "60000000",
    blockTimestamp: "2026-09-09T00:00:00.000Z",
    outputHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    checks: [
      {
        id: "yield-asset",
        label: "Yield asset identity",
        status: "verified",
        summary: "USDC identity was reproduced on BNB Chain.",
        source: "BNB Chain",
        observedAt: "2026-09-09T00:00:00.000Z",
      },
      {
        id: "yield-economic-claim",
        label: "Yield/APY claim",
        status: "not-verifiable",
        summary: "Claimed APY was not independently reproduced.",
        source: "AgentDesk evidence boundary",
        observedAt: "2026-09-09T00:00:00.000Z",
      },
    ],
    depth: {
      verdict: "MIXED EVIDENCE",
      title: "Yield route evidence",
      scenarioLabel: "Scenario capital only",
      verifiedCount: 1,
      conflictCount: 0,
      unresolvedCount: 1,
      errorCount: 0,
      machineReadableClaims: true,
      highlights: ["USDC identity was reproduced on BNB Chain."],
    },
    boundary: "Verified context does not prove future return.",
    ...overrides,
  };
}

function input(value: IndependentVerification): BrainAnalysisInput {
  return {
    tokenId: 302258,
    task: {
      category: "Yield Optimisation",
      asset: "USDC",
      amount: "500",
      riskPreference: "moderate",
    },
    output: "Agent proposed a yield route.",
    verification: value,
  };
}

test("deterministic Brain preserves unresolved APY instead of upgrading it", () => {
  const analysis = buildEvidenceEngineAnalysis(input(verification()));
  expect(analysis.decision).toBe("MIXED");
  expect(analysis.verifiedFacts).toContain("USDC identity was reproduced on BNB Chain.");
  expect(analysis.unresolvedClaims).toContain("Claimed APY was not independently reproduced.");
  expect(analysis.boundary.toLowerCase()).toContain("never upgrades");
});

test("deterministic Brain surfaces conflicts as CONFLICT", () => {
  const conflictCheck = {
    id: "yield-pool-claim",
    label: "Claimed pool address",
    status: "conflict" as const,
    summary: "The agent pool address conflicts with the independently resolved pool.",
    source: "PancakeSwap V3",
    observedAt: "2026-09-09T00:00:00.000Z",
  };
  const current = verification({
    status: "CONFLICT",
    checks: [...verification().checks, conflictCheck],
    depth: {
      ...verification().depth,
      verdict: "CONFLICT WITH LIVE CONTEXT",
      conflictCount: 1,
    },
  });
  const analysis = buildEvidenceEngineAnalysis(input(current));
  expect(analysis.decision).toBe("CONFLICT");
  expect(analysis.conflicts).toContain(conflictCheck.summary);
});
