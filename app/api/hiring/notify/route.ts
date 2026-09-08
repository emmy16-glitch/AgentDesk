import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { bscMainnet, bscTestnet } from "@/lib/bsc";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { ERC8183_DEPLOYMENTS, erc8183CommerceAbi, isSupportedCommerceChainId } from "@/lib/erc8183";
import { notifyFundedAdvertisedA2A } from "@/lib/hiring/negotiate-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicClient(chainId: 56 | 97) {
  const chain = chainId === 56 ? bscMainnet : bscTestnet;
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0], { timeout: 8_000 }),
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid funded-job notification request" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const tokenId = Number(input.tokenId);
  const chainId = Number(input.chainId);
  const jobId = String(input.jobId ?? "").trim();
  if (!Number.isSafeInteger(tokenId) || tokenId < 0 || !isSupportedCommerceChainId(chainId) || !/^\d+$/.test(jobId)) {
    return NextResponse.json({ ok: false, error: "Supply a valid ERC-8004 tokenId, ERC-8183 jobId and BNB chainId" }, { status: 400 });
  }

  try {
    const [identity, job] = await Promise.all([
      resolveOnChainAgentIdentity(tokenId),
      publicClient(chainId).readContract({
        address: ERC8183_DEPLOYMENTS[chainId].commerce,
        abi: erc8183CommerceAbi,
        functionName: "getJob",
        args: [BigInt(jobId)],
      }),
    ]);

    if (!identity.agentWallet || job.provider.toLowerCase() !== identity.agentWallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Funded job provider does not match the selected ERC-8004 identity" }, { status: 409 });
    }

    const status = Number(job.status);
    if (status !== 1) {
      return NextResponse.json({
        ok: true,
        notified: false,
        detail: status >= 2
          ? "Provider has already submitted or completed this job; notify_funded is no longer needed."
          : "Job is not currently in FUNDED state, so AgentDesk did not send notify_funded.",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const notification = await notifyFundedAdvertisedA2A(identity.services, { jobId, chainId });
    return NextResponse.json({
      ok: true,
      ...notification,
      checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider funded-job notification failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
