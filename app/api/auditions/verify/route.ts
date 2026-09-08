import { NextRequest, NextResponse } from "next/server";
import { parseAuditionRequest } from "@/lib/auditions/validation";
import { verifyAgainstBnbState } from "@/lib/auditions/bnb-ground-truth";

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
    return NextResponse.json({ ok: false, error: "Invalid verification request" }, { status: 400 });
  }

  const object = body as Record<string, unknown>;
  const parsed = parseAuditionRequest({ tokenId: object.tokenId, task: object.task });
  const output = typeof object.output === "string" ? object.output.trim() : "";
  if (!parsed || !output || output.length > MAX_OUTPUT_LENGTH) {
    return NextResponse.json({
      ok: false,
      error: `Verification requires a valid audition task and non-empty output no longer than ${MAX_OUTPUT_LENGTH} characters`,
    }, { status: 400 });
  }

  try {
    const verification = await verifyAgainstBnbState(parsed.task, output);
    return NextResponse.json({
      ok: true,
      tokenId: parsed.tokenId,
      verification,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Independent BNB verification failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
