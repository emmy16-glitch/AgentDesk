import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({
    ok: true,
    service: "agentdesk",
    status: "alive",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    checkedAt: new Date().toISOString(),
    proofBoundary: "Liveness only. This endpoint does not claim that BSC, ERC-8004 discovery, an agent endpoint, or ERC-8183 commerce is currently reachable.",
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-AgentDesk-Proof-Boundary", "liveness-only");
  return response;
}
