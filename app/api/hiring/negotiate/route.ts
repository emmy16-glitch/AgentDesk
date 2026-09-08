import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, type Address } from "viem";
import { parseAuditionRequest } from "@/lib/auditions/validation";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { ERC8183_DEPLOYMENTS } from "@/lib/erc8183";
import {
  buildCanonicalJobDescription,
  parseCanonicalNegotiationEnvelope,
  signedTaskContainsReceipt,
} from "@/lib/hiring/erc8183-negotiation";
import { negotiateAdvertisedService } from "@/lib/hiring/negotiate-transport";
import { describeHireTask } from "@/lib/hiring/task-description";
import { readCommercePaymentToken, verifyCanonicalProviderQuote } from "@/lib/hiring/verify-erc8183-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECEIPT_HASH = /^0x[0-9a-fA-F]{64}$/;

function bodyRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isoFromSeconds(value: number | null): string | null {
  return value === null ? null : new Date(value * 1000).toISOString();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const auditionRequest = parseAuditionRequest(body);
  const rawBody = bodyRecord(body);
  const auditionReceiptHash = typeof rawBody?.auditionReceiptHash === "string"
    ? rawBody.auditionReceiptHash.trim()
    : "";
  if (!auditionRequest || !RECEIPT_HASH.test(auditionReceiptHash)) {
    return NextResponse.json({
      ok: false,
      error: "Invalid hire negotiation request. A task, ERC-8004 tokenId, and 32-byte auditionReceiptHash are required.",
    }, { status: 400 });
  }

  try {
    const identity = await resolveOnChainAgentIdentity(auditionRequest.tokenId);
    if (!identity.agentWallet || !isAddress(identity.agentWallet)) {
      return NextResponse.json({
        ok: false,
        error: "This ERC-8004 identity has no agent wallet. AgentDesk will not fund a provider without an on-chain identity anchor.",
      }, { status: 422, headers: { "Cache-Control": "no-store" } });
    }

    const trustedProvider = getAddress(identity.agentWallet);
    const taskDescription = `${describeHireTask(auditionRequest.task)}\nAgentDesk audition receipt: ${auditionReceiptHash}`;
    const transport = await negotiateAdvertisedService(identity.services, {
      task_description: taskDescription,
      terms: {
        deliverables: `Task-specific ${auditionRequest.task.category} result with assumptions and evidence where available`,
        quality_standards: "Return the requested work for the funded job. Do not silently substitute another task.",
        success_criteria: [
          "The delivered result must address the exact funded task.",
          `Preserve the AgentDesk audition receipt ${auditionReceiptHash} in the signed task record.`,
        ],
      },
    });

    const parsed = parseCanonicalNegotiationEnvelope(transport.raw);
    const deployment = ERC8183_DEPLOYMENTS[parsed.envelope.chain_id];

    if (getAddress(parsed.envelope.verifying_contract) !== getAddress(deployment.commerce)) {
      return NextResponse.json({ ok: false, error: "Agent quote points at a non-canonical ERC-8183 Commerce contract" }, { status: 409 });
    }

    if (parsed.providerAddress && getAddress(parsed.providerAddress) !== trustedProvider) {
      return NextResponse.json({ ok: false, error: "Negotiated provider does not match the ERC-8004 agent wallet" }, { status: 409 });
    }

    if (!signedTaskContainsReceipt(parsed.envelope, auditionReceiptHash)) {
      return NextResponse.json({
        ok: false,
        error: "Provider quote did not preserve the audition receipt in the signed task. AgentDesk will not create an unlinkable paid job.",
      }, { status: 409 });
    }

    const livePaymentToken = await readCommercePaymentToken({
      chainId: parsed.envelope.chain_id,
      commerce: deployment.commerce,
    });
    if (getAddress(parsed.paymentToken) !== livePaymentToken) {
      return NextResponse.json({
        ok: false,
        error: "Signed quote currency does not match the live ERC-8183 Commerce payment token",
      }, { status: 409 });
    }
    if (livePaymentToken !== getAddress(deployment.paymentToken)) {
      return NextResponse.json({
        ok: false,
        error: "AgentDesk deployment metadata does not match the live Commerce paymentToken; funding is blocked safely.",
      }, { status: 503 });
    }

    if (parsed.quoteExpiresAtSeconds !== null && parsed.quoteExpiresAtSeconds * 1000 <= Date.now()) {
      return NextResponse.json({ ok: false, error: "Agent quote expired before it could be presented" }, { status: 409 });
    }

    const signature = await verifyCanonicalProviderQuote({
      envelope: parsed.envelope,
      expectedProvider: trustedProvider,
      expectedVerifyingContract: deployment.commerce as Address,
    });

    const description = buildCanonicalJobDescription(parsed.envelope);
    if (!description.toLowerCase().includes(auditionReceiptHash.toLowerCase())) {
      throw new Error("Canonical ERC-8183 job description lost the audition receipt commitment");
    }

    const checkedAt = new Date().toISOString();
    return NextResponse.json({
      ok: true,
      quote: {
        accepted: true,
        tokenId: auditionRequest.tokenId,
        provider: trustedProvider,
        providerSource: "erc8004-agent-wallet",
        priceBaseUnits: parsed.priceBaseUnits,
        currency: "$U",
        paymentToken: livePaymentToken,
        chainId: parsed.envelope.chain_id,
        quoteExpiresAt: isoFromSeconds(parsed.quoteExpiresAtSeconds),
        providerSignature: parsed.envelope.provider_sig,
        negotiationHash: parsed.envelope.negotiation_hash,
        signatureMethod: signature.method,
        signatureCheckedAtBlock: signature.blockNumber.toString(),
        verifyingContract: deployment.commerce,
        serviceEndpoint: transport.serviceEndpoint,
        negotiationEndpoint: transport.negotiationEndpoint,
        transport: transport.transport,
        taskDescription,
        auditionReceiptHash,
        task: auditionRequest.task,
        checkedAt,
        envelope: parsed.envelope,
        raw: transport.raw,
      },
      proofBoundary: `The ${transport.transport} service returned a provider-signed quote bound to the ERC-8004 agent wallet, BNB chain, live payment token, canonical Commerce contract, and this audition receipt. Funding has not happened yet.`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERC-8183 negotiation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
