import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, keccak256, toHex } from "viem";
import { bscMainnet, bscTestnet } from "@/lib/bsc";
import { resolveOnChainAgentIdentity, type AgentService } from "@/lib/erc8004-registry";
import { ERC8183_DEPLOYMENTS, JOB_STATUS_LABELS, erc8183CommerceAbi, isSupportedCommerceChainId } from "@/lib/erc8183";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DELIVERABLE_BYTES = 1024 * 1024;

function isErc8183Service(service: AgentService) {
  const name = service.name.toLowerCase().replaceAll("-", "").replaceAll("_", "").replaceAll(" ", "");
  return name.includes("erc8183") || name.includes("agenticcommerce") || name === "apex";
}

function commerceServiceBase(endpoint: string): URL {
  const url = new URL(endpoint);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/(status|negotiate|health)\/?$/i, "/");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

function publicClient(chainId: 56 | 97) {
  const chain = chainId === 56 ? bscMainnet : bscTestnet;
  const configured = chainId === 56
    ? process.env.BSC_MAINNET_RPC_URL?.trim()
    : process.env.BSC_TESTNET_RPC_URL?.trim();
  return createPublicClient({ chain, transport: http(configured || chain.rpcUrls.default.http[0], { timeout: 8_000 }) });
}

async function readDeliverable(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DELIVERABLE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Provider deliverable exceeded AgentDesk display limit");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_DELIVERABLE_BYTES) {
    throw new Error("Provider deliverable exceeded AgentDesk display limit");
  }

  let value: unknown = text;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json") || /^[\[{]/.test(text.trim())) {
    try { value = JSON.parse(text) as unknown; } catch { value = text; }
  }
  return { value, contentHash: keccak256(toHex(text)) };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid job status request" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const tokenId = Number(input.tokenId);
  const chainId = Number(input.chainId);
  const jobText = String(input.jobId ?? "").trim();
  if (!Number.isSafeInteger(tokenId) || tokenId < 0 || !isSupportedCommerceChainId(chainId) || !/^\d+$/.test(jobText)) {
    return NextResponse.json({ ok: false, error: "Supply a valid ERC-8004 tokenId, ERC-8183 jobId and BNB chainId (56 or 97)" }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(tokenId);
    const service = identity.services.find(isErc8183Service);
    if (!service) {
      return NextResponse.json({ ok: false, error: "Selected identity no longer advertises an ERC-8183 service" }, { status: 409 });
    }

    const deployment = ERC8183_DEPLOYMENTS[chainId];
    const client = publicClient(chainId);
    const jobId = BigInt(jobText);
    const job = await client.readContract({
      address: deployment.commerce,
      abi: erc8183CommerceAbi,
      functionName: "getJob",
      args: [jobId],
    });

    if (identity.agentWallet && job.provider.toLowerCase() !== identity.agentWallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "On-chain ERC-8183 provider no longer matches the selected ERC-8004 agent wallet" }, { status: 409 });
    }

    const statusCode = Number(job.status);
    const status = JOB_STATUS_LABELS[statusCode] ?? `UNKNOWN(${statusCode})`;
    let deliverable: null | {
      available: true;
      source: string;
      contentHash: string;
      value: unknown;
    } = null;
    let deliverableError: string | null = null;

    if (statusCode === 2 || statusCode === 3) {
      const serviceValidation = await validatePublicHttpsUrl(service.endpoint);
      if (!serviceValidation.ok) {
        deliverableError = `Advertised ERC-8183 service is no longer safe to query: ${serviceValidation.reason}`;
      } else {
        const base = commerceServiceBase(serviceValidation.url.toString());
        const responseUrl = new URL(`job/${jobText}/response`, base);
        const responseValidation = await validatePublicHttpsUrl(responseUrl.toString());
        if (!responseValidation.ok) {
          deliverableError = `Provider response URL failed safety validation: ${responseValidation.reason}`;
        } else {
          try {
            const response = await fetch(responseValidation.url, {
              method: "GET",
              headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.5", "User-Agent": "AgentDesk-ERC8183-Buyer/1.0" },
              redirect: "manual",
              cache: "no-store",
              signal: AbortSignal.timeout(8_000),
            });
            if (response.ok) {
              const read = await readDeliverable(response);
              deliverable = {
                available: true,
                source: responseValidation.url.toString(),
                contentHash: read.contentHash,
                value: read.value,
              };
            } else {
              await response.body?.cancel().catch(() => undefined);
              deliverableError = `Provider response endpoint returned HTTP ${response.status}`;
            }
          } catch (error) {
            deliverableError = error instanceof Error ? error.message : "Provider deliverable could not be retrieved";
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      identity: {
        tokenId,
        agentWallet: identity.agentWallet,
        sourceUrl: identity.explorerUrl,
      },
      job: {
        jobId: jobText,
        chainId,
        client: job.client,
        provider: job.provider,
        evaluator: job.evaluator,
        description: job.description,
        budget: job.budget.toString(),
        expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
        status,
        statusCode,
        hook: job.hook,
      },
      deliverable,
      deliverableError,
      proofBoundary: statusCode === 3
        ? "ERC-8183 reports COMPLETED on-chain. The provider result is displayed only when the advertised service can supply it."
        : statusCode === 2
          ? "The provider has submitted work on-chain. Settlement/completion has not happened yet."
          : statusCode === 1
            ? "Escrow is funded. The provider has not yet submitted work."
            : "AgentDesk reports the exact current ERC-8183 state without promoting it to completion.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify ERC-8183 job";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
