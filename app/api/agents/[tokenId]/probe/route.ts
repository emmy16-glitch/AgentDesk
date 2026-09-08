import { NextRequest, NextResponse } from "next/server";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { probeAgentServices } from "@/lib/agent-liveness";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId: rawTokenId } = await params;
  const tokenId = Number(rawTokenId);
  if (!Number.isSafeInteger(tokenId) || tokenId < 0) {
    return NextResponse.json({ ok: false, error: "Invalid ERC-8004 token ID" }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(tokenId);
    const probes = await probeAgentServices(identity);
    const reachable = probes.filter((probe) => probe.state === "reachable").length;

    return NextResponse.json({
      ok: true,
      tokenId,
      checkedAt: new Date().toISOString(),
      servicesAdvertised: identity.services.length,
      servicesProbed: probes.length,
      reachable,
      operationalStatus: probes.length === 0
        ? "no-probeable-services"
        : reachable > 0
          ? "endpoint-reachable"
          : "endpoint-unreachable",
      probes,
      scope: "HTTP reachability only; this does not prove task quality, economic safety, or successful execution.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown availability probe error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
