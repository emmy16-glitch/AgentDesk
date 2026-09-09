import { NextRequest, NextResponse } from "next/server";
import { evaluateCapabilityProposal } from "@/lib/authorization/policy";
import { requestAuctorailPreflight } from "@/lib/authorization/auctorail";
import type { AuthorizationProposal } from "@/lib/authorization/types";
import { isPaidToolId } from "@/lib/capabilities/catalog";
import { parseHireCapabilityPolicy } from "@/lib/capabilities/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : undefined;
}

function parseProposal(value: unknown): AuthorizationProposal | null {
  const raw = record(value);
  if (!raw || (raw.kind !== "external-intelligence" && raw.kind !== "paid-tool-call" && raw.kind !== "transaction")) return null;
  const toolId = raw.toolId === undefined ? undefined : isPaidToolId(raw.toolId) ? raw.toolId : null;
  if (toolId === null) return null;
  const chainId = raw.chainId === undefined ? undefined : Number(raw.chainId);
  if (chainId !== undefined && (!Number.isSafeInteger(chainId) || chainId < 1)) return null;
  return {
    kind: raw.kind,
    ...(toolId ? { toolId } : {}),
    ...(cleanString(raw.description) ? { description: cleanString(raw.description)! } : {}),
    ...(cleanString(raw.amount, 50) ? { amount: cleanString(raw.amount, 50)! } : {}),
    ...(cleanString(raw.asset, 30) ? { asset: cleanString(raw.asset, 30)! } : {}),
    ...(cleanString(raw.recipient, 300) ? { recipient: cleanString(raw.recipient, 300)! } : {}),
    ...(cleanString(raw.protocol, 100) ? { protocol: cleanString(raw.protocol, 100)! } : {}),
    ...(cleanString(raw.reference, 120) ? { reference: cleanString(raw.reference, 120)! } : {}),
    ...(chainId ? { chainId } : {}),
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }
  const raw = record(body);
  const policy = parseHireCapabilityPolicy(raw?.policy);
  const proposal = parseProposal(raw?.proposal);
  const agentId = cleanString(raw?.agentId, 200) || "agentdesk-agent";
  if (!policy || !proposal) {
    return NextResponse.json({ ok: false, error: "A valid capability policy and action proposal are required." }, { status: 400 });
  }

  const local = evaluateCapabilityProposal(policy, proposal);
  if (local.decision !== "ALLOW") {
    return NextResponse.json({
      ok: true,
      decision: local.decision,
      evaluation: local,
      auctorail: null,
      executable: false,
      proofBoundary: local.boundary,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const auctorail = await requestAuctorailPreflight({ agentId, policy, proposal });
  const finalDecision = auctorail?.decision ?? local.decision;
  return NextResponse.json({
    ok: true,
    decision: finalDecision,
    evaluation: local,
    auctorail,
    executable: false,
    proofBoundary: auctorail?.boundary ?? local.boundary,
  }, { headers: { "Cache-Control": "no-store" } });
}
