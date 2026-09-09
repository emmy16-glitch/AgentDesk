import { runDiscoveryStream } from "@/lib/discovery/orchestration";
import type { AuditionTask } from "@/lib/auditions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const task: AuditionTask = {
    category: "Yield Optimisation",
    asset: "USDC",
    amount: "500",
    riskPreference: "moderate",
    instructions: "Find a low-risk yield option for 500 USDC. This is a read-only pre-hire audition; do not execute transactions.",
  };

  const events: unknown[] = [];
  const started = Date.now();
  try {
    for await (const event of runDiscoveryStream({ task })) {
      events.push(event);
    }
    return Response.json({ ok: true, elapsedMs: Date.now() - started, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, elapsedMs: Date.now() - started, error: error instanceof Error ? error.message : "Smoke check failed", events }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
