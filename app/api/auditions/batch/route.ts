import { NextRequest, NextResponse } from "next/server";
import { runAudition } from "@/lib/auditions/engine";
import { compareAuditions } from "@/lib/auditions/compare";
import { parseBatchAuditionRequest } from "@/lib/auditions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = parseBatchAuditionRequest(body);
  if (!parsed) {
    return NextResponse.json({
      ok: false,
      error: "Invalid batch audition request. Supply 1-4 unique BSC ERC-8004 token IDs and one valid task.",
    }, { status: 400 });
  }

  const settled = await Promise.allSettled(
    parsed.tokenIds.map((tokenId) => runAudition({ tokenId, task: parsed.task })),
  );

  const results = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = settled.flatMap((result, index) => result.status === "rejected"
    ? [{
        tokenId: parsed.tokenIds[index],
        error: result.reason instanceof Error ? result.reason.message : "Candidate identity/audition resolution failed",
      }]
    : []);

  const compared = compareAuditions(results, parsed.task.guardrails);

  return NextResponse.json({
    ok: true,
    category: parsed.task.category,
    checkedAt: new Date().toISOString(),
    requested: parsed.tokenIds.length,
    compared: compared.length,
    results: compared,
    failures,
    rankingMethod: [
      "hard rule conflicts",
      "audition completion status",
      "usable task-specific output",
      "confirmed rule compatibility",
      "machine-readable quote availability",
      "preserved evidence count",
      "measured latency",
    ],
    scope: "Comparison uses only observable audition evidence. It does not create a global trust score or imply economic correctness.",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
