import { NextResponse } from "next/server";
import { camberBrainEnabled, getCamberBrainAgentTag } from "@/lib/brain/camber-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
  const camberEnabled = camberBrainEnabled();
  const camberOauthPresent = Boolean(process.env.CAMBER_MCP_ACCESS_TOKEN?.trim());
  const camberCliApiKeyPresent = Boolean(process.env.CAMBER_API_KEY?.trim());

  return NextResponse.json({
    ok: true,
    project: "AgentDesk",
    tagline: "Don't trust the profile. Audition the agent.",
    track: "BNB Agent Studio Marketplace",
    build: commit,
    implementation: {
      sourceBackedErc8004Discovery: "complete",
      liveAgentAuditions: "complete-and-live-verified",
      fourCategoryDepth: "complete",
      agentDeskBrain: "complete-with-deterministic-fallback",
      erc8183HiringFlow: "implementation-complete",
      productionHardening: "complete",
    },
    runtime: {
      camberBrainEnabled: camberEnabled,
      brainMode: camberEnabled ? "camber-remote-mcp-with-deterministic-fallback" : "deterministic-evidence-engine",
      camberTransport: "https-remote-mcp-oauth",
      camberAgentTag: getCamberBrainAgentTag(),
      camberCredentialPresent: camberOauthPresent,
      camberOauthAccessTokenPresent: camberOauthPresent,
      camberCliApiKeyPresent,
      camberAuthNote: camberEnabled
        ? "Remote Camber MCP has an OAuth access token configured."
        : camberCliApiKeyPresent
          ? "A Camber CLI API key is present, but Camber remote MCP requires OAuth; AgentDesk is using its deterministic Brain fallback."
          : "Camber remote MCP OAuth is not configured; AgentDesk is using its deterministic Brain fallback.",
    },
    openProofGates: {
      realExternalPaidErc8183Job: {
        status: "open",
        issue: "https://github.com/emmy16-glitch/AgentDesk/issues/5",
        requirement: "A real buyer wallet must fund a genuine external provider and receive independently inspectable submission/completion evidence.",
      },
    },
    evidenceBoundary: [
      "registry-listed",
      "on-chain-identity-resolved",
      "metadata-resolved",
      "service-advertised",
      "endpoint-reachable",
      "audition-passed",
      "independent-context-checked",
      "signed-hire-terms-verified",
      "funded",
      "result-submitted",
      "completed",
    ],
    warning: "This endpoint reports implementation/runtime configuration only. It is not proof that any specific external provider was paid or reached ERC-8183 COMPLETED.",
    checkedAt: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "no-store",
      "X-AgentDesk-Proof-Boundary": "submission-status-not-job-proof",
    },
  });
}
