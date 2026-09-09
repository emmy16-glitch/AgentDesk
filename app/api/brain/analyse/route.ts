import { NextRequest, NextResponse } from "next/server";
import { parseAuditionRequest } from "@/lib/auditions/validation";
import { verifyAgainstBnbState } from "@/lib/auditions/bnb-ground-truth";
import { analyseWithCamber, camberBrainEnabled } from "@/lib/brain/camber-brain";
import { buildEvidenceEngineAnalysis } from "@/lib/brain/evidence-engine";
import type { BrainAnalysisInput } from "@/lib/brain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT_LENGTH = 80_000;

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
    };

    let analysis = buildEvidenceEngineAnalysis(input);
    let camberAttempted = false;
    if (camberBrainEnabled()) {
      camberAttempted = true;
      try {
        analysis = await analyseWithCamber(input);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Camber Brain was unavailable";
        analysis = buildEvidenceEngineAnalysis(input, reason);
      }
    }

    return NextResponse.json({
      ok: true,
      tokenId: parsed.tokenId,
      verification,
      analysis,
      brain: {
        camberConfigured: camberBrainEnabled(),
        camberAttempted,
        proofBoundary: "Brain analysis explains existing evidence. It never changes an ERC-8004 identity state, an ERC-8183 job state, or an independent verification result.",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AgentDesk Brain analysis failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
