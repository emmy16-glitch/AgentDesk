import { NextRequest, NextResponse } from "next/server";
import {
  discoverAcrossRequiredCategories,
  listBscAgents,
  type MarketplaceCategory,
} from "@/lib/8004scan";

const REQUIRED_CATEGORIES: MarketplaceCategory[] = [
  "Health Factor Monitoring",
  "Yield Optimisation",
  "Grid Trading",
  "Rebalancing",
];

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") as MarketplaceCategory | null;
  const mode = request.nextUrl.searchParams.get("mode") ?? "required";

  try {
    if (mode === "registry") {
      const result = await listBscAgents(24);
      return NextResponse.json({
        ok: true,
        source: "8004scan",
        chainId: 56,
        provenance: {
          api: "https://8004scan.io/api/v1/public",
          registry: "ERC-8004",
          operationalClaim: "registry-listed only; endpoint reachability is not implied",
          checkedAt: result.checkedAt,
          upstreamTimestamp: result.upstreamTimestamp,
        },
        totalIndexedOnChain: result.total,
        agents: result.agents,
      });
    }

    const result = await discoverAcrossRequiredCategories(8);
    const agents = category && REQUIRED_CATEGORIES.includes(category)
      ? result.agents.filter((agent) => agent.category === category)
      : result.agents;

    return NextResponse.json({
      ok: true,
      source: "8004scan",
      chainId: 56,
      requiredCategories: REQUIRED_CATEGORIES,
      provenance: {
        api: "https://8004scan.io/api/v1/public",
        registry: "ERC-8004",
        checkedAt: result.checkedAt,
        classification: "keyword evidence from indexed agent name/description; semantic rank alone is never treated as category proof",
        operationalClaim: "registry-listed only; endpoint probing is a separate Phase 1 gate",
      },
      categoryCounts: result.categoryCounts,
      agents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown discovery error";
    return NextResponse.json(
      {
        ok: false,
        source: "8004scan",
        chainId: 56,
        error: message,
        fallback: null,
        note: "AgentDesk does not silently replace failed live discovery with fabricated marketplace data.",
      },
      { status: 502 },
    );
  }
}
