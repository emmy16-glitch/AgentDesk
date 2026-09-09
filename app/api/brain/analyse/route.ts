import { NextRequest, NextResponse } from "next/server";
import { parseAuditionRequest } from "@/lib/auditions/validation";
import { verifyAgainstBnbState } from "@/lib/auditions/bnb-ground-truth";
import { analyseWithCamber, camberBrainEnabled } from "@/lib/brain/camber-brain";
import { buildEvidenceEngineAnalysis } from "@/lib/brain/evidence-engine";
import type { BrainAnalysisInput } from "@/lib/brain/types";
import type { RuleCheck, RuleEvaluation } from "@/lib/guardrails/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT_LENGTH = 80_000;

function parseRuleEvaluation(value: unknown): RuleEvaluation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.checks) || typeof raw.hardFailure !== "boolean") return undefined;
  const checks = raw.checks.flatMap((entry): RuleCheck[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const check = entry as Record<string, unknown>;
    if ((check.id !== "price" && check.id !== "protocol" && check.id !== "risk" && check.id !== "action") || (check.status !== "pass" && check.status !== "fail" && check.status !== "unknown") || typeof check.label !== "string" || typeof check.summary !== "string") return [];
    return [{ id: check.id, status: check.status, label: check.label, summary: check.summary }];
  });
  if (checks.length !== raw.checks.length) return undefined;
  const passedCount = checks.filter((check) => check.status === "pass").length;
  const failedCount = checks.filter((check) => check.status === "fail").length;
  const unknownCount = checks.filter((check) => check.status === "unknown").length;
  return { status: raw.hardFailure || failedCount ? "conflict" : unknownCount ? "partial" : "fits", checks, hardFailure: raw.hardFailure, passedCount, failedCount, unknownCount };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid Brain analysis request" }, { status: 400 });
  }

  const object = body as Record<string, unknown>;
  const parsed = parseAuditionRequest({ tokenId: object.tokenId, task: object.task });
  const output = typeof object.output === "string" ? object.output.trim() : "";
  if (!parsed || !output || output.length > MAX_OUTPUT_LENGTH) {
    return NextResponse.json({
      ok: false,
      error: `Brain analysis requires a valid audition task and non-empty output no longer than ${MAX_OUTPUT_LENGTH} characters`,
    }, { status: 400 });
  }

  try {
    const verification = await verifyAgainstBnbState(parsed.task, output);
    const input: BrainAnalysisInput = {
      tokenId: parsed.tokenId,
      task: parsed.task,
      output,
      verification,
      ruleEvaluation: parseRuleEvaluation(object.ruleEvaluation),
    };

    let analysis = buildEvidenceEngineAnalysis(input);
    if (camberBrainEnabled()) {
      try {
        analysis = await analyseWithCamber(input);
      } catch { analysis = buildEvidenceEngineAnalysis(input); }
    }

    return NextResponse.json({
      ok: true,
      tokenId: parsed.tokenId,
      verification,
      analysis,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AgentDesk Brain analysis failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
