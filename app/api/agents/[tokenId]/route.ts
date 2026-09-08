import { NextRequest, NextResponse } from "next/server";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";

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
    return NextResponse.json({
      ok: true,
      source: "BSC ERC-8004 Identity Registry",
      identity,
      claims: {
        registeredOnBsc: true,
        metadataResolved: identity.metadataStatus === "resolved",
        endpointAdvertised: identity.services.length > 0,
        endpointReachable: null,
      },
      note: "Endpoint reachability is intentionally unknown until the service is probed; registration alone is not treated as liveness.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ERC-8004 resolution error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
