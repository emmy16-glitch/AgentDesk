import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { parseAuditionRequest } from "@/lib/auditions/validation";
import { resolveOnChainAgentIdentity, type AgentService } from "@/lib/erc8004-registry";
import { ERC8183_DEPLOYMENTS, isSupportedCommerceChainId } from "@/lib/erc8183";
import { describeHireTask } from "@/lib/hiring/task-description";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESPONSE_BYTES = 256 * 1024;

function isErc8183Service(service: AgentService) {
  const name = service.name.toLowerCase().replaceAll("-", "").replaceAll("_", "").replaceAll(" ", "");
  return name.includes("erc8183") || name.includes("agenticcommerce") || name === "apex";
}

function negotiationUrl(service: AgentService): string {
  const raw = service.endpoint.trim();
  const url = new URL(raw);
  if (/\/negotiate\/?$/i.test(url.pathname)) return url.toString();
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return new URL("negotiate", url).toString();
}

async function readJsonLimited(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("ERC-8183 negotiation response exceeded AgentDesk evidence size limit");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("ERC-8183 negotiation response exceeded AgentDesk evidence size limit");
  }
  return JSON.parse(text) as unknown;
}

function quoteObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || depth > 4) return null;
  if (!Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const hasPrice = typeof object.price === "string" || typeof object.price === "number";
    const hasChain = typeof object.chain_id === "number" || typeof object.chainId === "number";
    if (hasPrice && hasChain) return object;
  }
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const found = quoteObject(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function normaliseExpiry(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    return new Date(millis).toISOString();
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const millis = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function firstString(object: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const auditionRequest = parseAuditionRequest(body);
  if (!auditionRequest) {
    return NextResponse.json({ ok: false, error: "Invalid hire negotiation request" }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(auditionRequest.tokenId);
    const service = identity.services.find(isErc8183Service);
    if (!service) {
      return NextResponse.json({
        ok: false,
        supported: false,
        error: "This ERC-8004 identity does not advertise an ERC-8183 / Agentic Commerce service. AgentDesk will not guess a hire endpoint from its A2A or generic web URL.",
      }, { status: 422, headers: { "Cache-Control": "no-store" } });
    }

    const serviceValidation = await validatePublicHttpsUrl(service.endpoint);
    if (!serviceValidation.ok) {
      return NextResponse.json({ ok: false, error: `Advertised ERC-8183 service is unsafe to call: ${serviceValidation.reason}` }, { status: 422 });
    }

    const target = negotiationUrl({ ...service, endpoint: serviceValidation.url.toString() });
    const targetValidation = await validatePublicHttpsUrl(target);
    if (!targetValidation.ok) {
      return NextResponse.json({ ok: false, error: `ERC-8183 negotiation endpoint is unsafe to call: ${targetValidation.reason}` }, { status: 422 });
    }

    const taskDescription = describeHireTask(auditionRequest.task);
    const response = await fetch(targetValidation.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "AgentDesk-ERC8183-Buyer/1.0",
      },
      body: JSON.stringify({
        task_description: taskDescription,
        terms: {
          deliverables: `Task-specific ${auditionRequest.task.category} result with assumptions and evidence where available`,
          quality_standards: "Return the requested work for the funded job. Do not silently substitute another task.",
        },
      }),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return NextResponse.json({ ok: false, error: `Advertised ERC-8183 negotiation returned HTTP ${response.status}` }, { status: 502 });
    }

    const raw = await readJsonLimited(response);
    const quote = quoteObject(raw);
    if (!quote) {
      return NextResponse.json({ ok: false, error: "ERC-8183 service responded, but no machine-readable price/chain quote was present" }, { status: 502 });
    }

    const accepted = quote.accepted === undefined ? true : quote.accepted === true;
    if (!accepted) {
      return NextResponse.json({ ok: false, accepted: false, error: firstString(quote, ["reason", "error", "message"]) || "Agent declined this hire request", raw }, { status: 409 });
    }

    const chainValue = typeof quote.chain_id === "number" ? quote.chain_id : quote.chainId;
    if (typeof chainValue !== "number" || !isSupportedCommerceChainId(chainValue)) {
      return NextResponse.json({ ok: false, error: "Agent quote did not target supported BNB Smart Chain mainnet/testnet ERC-8183 deployments" }, { status: 422 });
    }

    const deployment = ERC8183_DEPLOYMENTS[chainValue];
    const price = String(quote.price ?? "").trim();
    if (!/^\d+$/.test(price) || BigInt(price) <= BigInt(0)) {
      return NextResponse.json({ ok: false, error: "Agent quote price must be positive integer base units" }, { status: 422 });
    }

    const providerFromQuote = firstString(quote, ["provider", "provider_address", "providerAddress"]);
    if (providerFromQuote && !isAddress(providerFromQuote)) {
      return NextResponse.json({ ok: false, error: "Agent quote returned an invalid provider address" }, { status: 422 });
    }
    if (providerFromQuote && identity.agentWallet && providerFromQuote.toLowerCase() !== identity.agentWallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Negotiated provider does not match the ERC-8004 agent wallet" }, { status: 409 });
    }

    const provider = providerFromQuote || identity.agentWallet;
    if (!provider || !isAddress(provider)) {
      return NextResponse.json({ ok: false, error: "No provider wallet could be bound to this ERC-8004 identity and quote" }, { status: 422 });
    }

    const verifyingContract = firstString(quote, ["verifying_contract", "verifyingContract"]);
    if (verifyingContract && (!isAddress(verifyingContract) || verifyingContract.toLowerCase() !== deployment.commerce.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Agent quote points at a non-canonical ERC-8183 commerce contract" }, { status: 409 });
    }

    const expires = normaliseExpiry(quote.quote_expires_at ?? quote.quoteExpiresAt);
    if (expires && Date.parse(expires) <= Date.now()) {
      return NextResponse.json({ ok: false, error: "Agent quote expired before it could be presented" }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      quote: {
        accepted: true,
        tokenId: auditionRequest.tokenId,
        provider,
        providerSource: providerFromQuote ? "negotiation-response" : "erc8004-agent-wallet",
        priceBaseUnits: price,
        currency: firstString(quote, ["currency", "asset", "symbol"]) || "$U",
        chainId: chainValue,
        quoteExpiresAt: expires,
        providerSignature: firstString(quote, ["provider_sig", "providerSignature"]),
        verifyingContract: verifyingContract || deployment.commerce,
        serviceEndpoint: serviceValidation.url.toString(),
        negotiationEndpoint: targetValidation.url.toString(),
        taskDescription,
        task: auditionRequest.task,
        checkedAt: new Date().toISOString(),
        raw,
      },
      proofBoundary: "The agent advertised ERC-8183 in ERC-8004 and returned current hire terms. Funding has not happened yet.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERC-8183 negotiation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
