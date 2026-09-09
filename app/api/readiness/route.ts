import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { bscMainnet } from "@/lib/bsc";
import { BSC_MAINNET_IDENTITY_REGISTRY } from "@/lib/erc8004-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_TIMEOUT_MS = 6_000;

function mainnetClient() {
  const configured = process.env.BSC_MAINNET_RPC_URL?.trim();
  return createPublicClient({
    chain: bscMainnet,
    transport: http(configured || bscMainnet.rpcUrls.default.http[0], { timeout: RPC_TIMEOUT_MS }),
  });
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const client = mainnetClient();
    const [blockNumber, registryCode] = await Promise.all([
      client.getBlockNumber(),
      client.getBytecode({ address: BSC_MAINNET_IDENTITY_REGISTRY }),
    ]);

    const registryReachable = Boolean(registryCode && registryCode !== "0x");
    const ready = registryReachable;
    const response = NextResponse.json({
      ok: ready,
      service: "agentdesk",
      status: ready ? "ready" : "degraded",
      checkedAt,
      checks: {
        bscMainnetRpc: {
          ok: true,
          chainId: 56,
          blockNumber: blockNumber.toString(),
        },
        erc8004IdentityRegistry: {
          ok: registryReachable,
          address: BSC_MAINNET_IDENTITY_REGISTRY,
          proof: registryReachable ? "contract bytecode observed" : "no contract bytecode observed",
        },
      },
      proofBoundary: "Readiness proves only that AgentDesk can reach BNB Smart Chain and observe the configured ERC-8004 Identity Registry. It does not promote any individual agent to reachable, auditioned, hired, or completed.",
    }, { status: ready ? 200 : 503 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-AgentDesk-Proof-Boundary", "bsc-and-registry-readiness-only");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "BNB readiness check failed";
    const response = NextResponse.json({
      ok: false,
      service: "agentdesk",
      status: "degraded",
      checkedAt,
      checks: {
        bscMainnetRpc: { ok: false },
        erc8004IdentityRegistry: { ok: false, address: BSC_MAINNET_IDENTITY_REGISTRY },
      },
      error: message,
      proofBoundary: "Upstream readiness failed. AgentDesk does not substitute cached or fabricated readiness evidence.",
    }, { status: 503 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-AgentDesk-Proof-Boundary", "readiness-failed");
    return response;
  }
}
