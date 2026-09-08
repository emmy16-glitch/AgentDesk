import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, getAddress, hexToString, http, keccak256, toHex, type Hex } from "viem";
import { bscMainnet, bscTestnet } from "@/lib/bsc";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { ERC8183_DEPLOYMENTS, JOB_STATUS_LABELS, erc8183CommerceAbi, isSupportedCommerceChainId } from "@/lib/erc8183";
import { canonicalJson } from "@/lib/hiring/erc8183-negotiation";
import { isDirectCommerceService } from "@/lib/hiring/negotiate-transport";
import { verifyFundedJobDescription } from "@/lib/hiring/verify-erc8183-quote";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DELIVERABLE_BYTES = 1024 * 1024;
const MAX_EVENT_SCAN_BLOCKS = BigInt(20_000);
const EVENT_SCAN_CHUNK = BigInt(1_000);
const RECEIPT_HASH = /^0x[0-9a-fA-F]{64}$/;

const jobInitialisedAbi = [{
  type: "event",
  name: "JobInitialised",
  anonymous: false,
  inputs: [
    { indexed: true, name: "jobId", type: "uint256" },
    { indexed: false, name: "deliverable", type: "bytes32" },
    { indexed: false, name: "submittedAt", type: "uint64" },
    { indexed: false, name: "optParams", type: "bytes" },
  ],
}] as const;

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

async function readBodyLimited(response: Response): Promise<{ text: string; value: unknown }> {
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
  return { text, value };
}

function deliverableHttpUrl(raw: string): string | null {
  if (raw.startsWith("ipfs://")) {
    const path = raw.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path ? `https://ipfs.io/ipfs/${path}` : null;
  }
  return raw.startsWith("https://") ? raw : null;
}

function manifestContent(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const root = value as Record<string, unknown>;
  if (!root.response || typeof root.response !== "object" || Array.isArray(root.response)) return value;
  const response = root.response as Record<string, unknown>;
  return response.content ?? value;
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
  const fundBlockText = String(input.fundBlock ?? "").trim();
  const receiptHash = String(input.receiptHash ?? "").trim();
  if (
    !Number.isSafeInteger(tokenId)
    || tokenId < 0
    || !isSupportedCommerceChainId(chainId)
    || !/^\d+$/.test(jobText)
    || !/^\d+$/.test(fundBlockText)
    || !RECEIPT_HASH.test(receiptHash)
  ) {
    return NextResponse.json({
      ok: false,
      error: "Supply a valid ERC-8004 tokenId, ERC-8183 jobId, funding block, audition receipt and BNB chainId (56 or 97)",
    }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(tokenId);
    const deployment = ERC8183_DEPLOYMENTS[chainId];
    const client = publicClient(chainId);
    const jobId = BigInt(jobText);
    const fundBlock = BigInt(fundBlockText);
    const job = await client.readContract({
      address: deployment.commerce,
      abi: erc8183CommerceAbi,
      functionName: "getJob",
      args: [jobId],
    });

    if (!identity.agentWallet || getAddress(job.provider) !== getAddress(identity.agentWallet)) {
      return NextResponse.json({ ok: false, error: "On-chain ERC-8183 provider does not match the selected ERC-8004 agent wallet" }, { status: 409 });
    }
    if (!job.description.toLowerCase().includes(receiptHash.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "On-chain ERC-8183 job description is not linked to the supplied audition receipt" }, { status: 409 });
    }

    let signedTerms: {
      verified: boolean;
      method?: string;
      negotiationHash?: string;
      error?: string;
    };
    try {
      const verified = await verifyFundedJobDescription({
        description: job.description,
        chainId,
        provider: getAddress(job.provider),
        expectedVerifyingContract: deployment.commerce,
        acceptanceBlock: fundBlock,
      });
      signedTerms = {
        verified: true,
        method: verified.method,
        negotiationHash: verified.negotiationHash,
      };
    } catch (error) {
      signedTerms = {
        verified: false,
        error: error instanceof Error ? error.message : "Provider-signed job terms could not be verified",
      };
    }

    const statusCode = Number(job.status);
    const status = JOB_STATUS_LABELS[statusCode] ?? `UNKNOWN(${statusCode})`;
    let deliverable: null | {
      available: true;
      source: string;
      contentHash: string;
      onChainHash?: string;
      verifiedAgainstChain?: boolean;
      value: unknown;
    } = null;
    let deliverableError: string | null = null;

    if (statusCode === 2 || statusCode === 3) {
      let onChainPointer: { url: string; hash: Hex } | null = null;
      try {
        const latest = await client.getBlockNumber();
        let fromBlock = fundBlock > BigInt(10) ? fundBlock - BigInt(10) : BigInt(0);
        if (latest > fromBlock && latest - fromBlock > MAX_EVENT_SCAN_BLOCKS) {
          fromBlock = latest - MAX_EVENT_SCAN_BLOCKS;
        }

        for (let start = fromBlock; start <= latest; start += EVENT_SCAN_CHUNK + BigInt(1)) {
          const end = start + EVENT_SCAN_CHUNK > latest ? latest : start + EVENT_SCAN_CHUNK;
          const logs = await client.getContractEvents({
            address: deployment.policy,
            abi: jobInitialisedAbi,
            eventName: "JobInitialised",
            args: { jobId },
            fromBlock: start,
            toBlock: end,
          });
          const event = logs[0];
          if (!event) continue;
          const args = event.args;
          const rawOptParams = args.optParams;
          const deliverableHash = args.deliverable;
          if (!rawOptParams || rawOptParams === "0x" || !deliverableHash) break;
          try {
            const params = JSON.parse(hexToString(rawOptParams)) as { deliverable_url?: string };
            if (typeof params.deliverable_url === "string" && params.deliverable_url.trim()) {
              onChainPointer = { url: params.deliverable_url.trim(), hash: deliverableHash };
            }
          } catch {
            deliverableError = "On-chain JobInitialised optParams did not contain valid JSON.";
          }
          break;
        }
      } catch (error) {
        deliverableError = error instanceof Error ? `On-chain deliverable-pointer scan failed: ${error.message}` : "On-chain deliverable-pointer scan failed";
      }

      if (onChainPointer) {
        const candidate = deliverableHttpUrl(onChainPointer.url);
        if (!candidate) {
          deliverableError = "On-chain deliverable_url uses an unsupported or unsafe URI scheme.";
        } else {
          const validation = await validatePublicHttpsUrl(candidate);
          if (!validation.ok) {
            deliverableError = `On-chain deliverable_url failed safety validation: ${validation.reason}`;
          } else {
            try {
              const response = await fetch(validation.url, {
                method: "GET",
                headers: { Accept: "application/json, text/plain;q=0.9", "User-Agent": "AgentDesk-ERC8183-DeliveryVerifier/1.0" },
                redirect: "manual",
                cache: "no-store",
                signal: AbortSignal.timeout(8_000),
              });
              if (!response.ok) {
                await response.body?.cancel().catch(() => undefined);
                deliverableError = `On-chain deliverable_url returned HTTP ${response.status}`;
              } else {
                const read = await readBodyLimited(response);
                if (typeof read.value !== "object" || read.value === null) {
                  deliverableError = "On-chain deliverable was not a structured manifest, so its ERC-8183 hash could not be reproduced.";
                } else {
                  const contentHash = keccak256(toHex(canonicalJson(read.value)));
                  if (contentHash.toLowerCase() !== onChainPointer.hash.toLowerCase()) {
                    deliverableError = "Retrieved deliverable manifest does not match the on-chain ERC-8183 deliverable hash.";
                  } else {
                    deliverable = {
                      available: true,
                      source: validation.url.toString(),
                      contentHash,
                      onChainHash: onChainPointer.hash,
                      verifiedAgainstChain: true,
                      value: manifestContent(read.value),
                    };
                    deliverableError = null;
                  }
                }
              }
            } catch (error) {
              deliverableError = error instanceof Error ? error.message : "On-chain deliverable could not be retrieved";
            }
          }
        }
      }

      if (!deliverable) {
        const directService = identity.services.find(isDirectCommerceService);
        if (directService) {
          const serviceValidation = await validatePublicHttpsUrl(directService.endpoint);
          if (serviceValidation.ok) {
            const base = commerceServiceBase(serviceValidation.url.toString());
            const responseUrl = new URL(`job/${jobText}/response`, base);
            const responseValidation = await validatePublicHttpsUrl(responseUrl.toString());
            if (responseValidation.ok) {
              try {
                const response = await fetch(responseValidation.url, {
                  method: "GET",
                  headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.5", "User-Agent": "AgentDesk-ERC8183-Buyer/2.0" },
                  redirect: "manual",
                  cache: "no-store",
                  signal: AbortSignal.timeout(8_000),
                });
                if (response.ok) {
                  const read = await readBodyLimited(response);
                  deliverable = {
                    available: true,
                    source: responseValidation.url.toString(),
                    contentHash: keccak256(toHex(read.text)),
                    verifiedAgainstChain: false,
                    value: read.value,
                  };
                } else {
                  await response.body?.cancel().catch(() => undefined);
                  deliverableError = deliverableError || `Provider response endpoint returned HTTP ${response.status}`;
                }
              } catch (error) {
                deliverableError = deliverableError || (error instanceof Error ? error.message : "Provider deliverable could not be retrieved");
              }
            }
          }
        }
      }
    }

    const proofBoundary = statusCode === 3
      ? deliverable?.verifiedAgainstChain
        ? "ERC-8183 reports COMPLETED and the retrieved provider manifest reproduces the on-chain deliverable hash."
        : "ERC-8183 reports COMPLETED on-chain, but AgentDesk has not reproduced the provider result against the on-chain deliverable hash."
      : statusCode === 2
        ? "The provider has submitted work on-chain. Settlement/completion has not happened yet."
        : statusCode === 1
          ? "Escrow is funded. The provider has not yet submitted work."
          : "AgentDesk reports the exact current ERC-8183 state without promoting it to completion.";

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      identity: {
        tokenId,
        agentWallet: identity.agentWallet,
        sourceUrl: identity.explorerUrl,
      },
      signedTerms,
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
      proofBoundary,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify ERC-8183 job";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
