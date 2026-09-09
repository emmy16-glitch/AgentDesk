import { NextResponse } from "next/server";
import { PAID_TOOL_CATALOG } from "@/lib/capabilities/catalog";
import { auctorailPreflightConfigured } from "@/lib/authorization/auctorail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    tools: PAID_TOOL_CATALOG,
    authorization: {
      taskPolicy: "AgentDesk capability policy",
      auctorailPreflightConfigured: auctorailPreflightConfigured(),
      decisions: ["ALLOW", "HOLD", "BLOCK"],
    },
    proofBoundary: "Listing a paid tool means AgentDesk knows how to describe and permission that provider. It does not prove a paid call occurred, that a wallet policy was enforced, or that returned intelligence was correct.",
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
