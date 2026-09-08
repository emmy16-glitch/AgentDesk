import { NextRequest, NextResponse } from "next/server";
import { runAudition } from "@/lib/auditions/engine";
import { parseAuditionRequest } from "@/lib/auditions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const auditionRequest = parseAuditionRequest(body);
  if (!auditionRequest) {
    return NextResponse.json({
      ok: false,
      error: "Invalid audition request. Supply a BSC ERC-8004 tokenId and the required fields for one supported task category.",
    }, { status: 400 });
  }

  try {
    const result = await runAudition(auditionRequest);
    return NextResponse.json({
      ok: true,
      result,
      scope: "Read-only pre-hire audition. A completed response is task-specific evidence, not proof of economic correctness or successful hiring.",
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown audition engine error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
