import { NextRequest, NextResponse } from "next/server";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { walletProviderProfile } from "@/lib/agent-wallets/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenIdFrom(request: NextRequest): number | null {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const marker = parts.indexOf("agents");
  const value = marker >= 0 ? Number(parts[marker + 1]) : NaN;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export async function GET(request: NextRequest) {
  const tokenId = tokenIdFrom(request);
  if (tokenId === null) {
    return NextResponse.json({ ok: false, error: "Invalid ERC-8004 token ID" }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(tokenId);
    const advertisement = identity.walletInfrastructure;
    return NextResponse.json({
      ok: true,
      tokenId,
      chainId: 56,
      agentWallet: identity.agentWallet,
      walletInfrastructure: advertisement,
      providerProfile: advertisement ? walletProviderProfile(advertisement.provider) : null,
      evidenceBoundary: advertisement
        ? "Wallet infrastructure is explicitly advertised by the agent registration. Provider capability does not prove that a task-specific wallet policy is configured or that any future action will be approved."
        : "AgentDesk found no explicit structured wallet-provider advertisement and will not infer custody from an address, description or brand mention.",
      checkedAt: identity.checkedAt,
    }, {
      headers: {
        "Cache-Control": "no-store",
        "X-AgentDesk-Proof-Boundary": "wallet-provider-advertisement-not-policy-proof",
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Agent wallet inspection failed",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
