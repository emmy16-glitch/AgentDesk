import { NextRequest } from "next/server";
import { runDiscoveryStream } from "@/lib/discovery/orchestration";
import type { DiscoveryStreamEvent } from "@/lib/discovery/types";
import { encodeSseEvent } from "@/lib/discovery/sse";
import { parseAuditionTask } from "@/lib/auditions/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encode(event: DiscoveryStreamEvent): Uint8Array {
  return new TextEncoder().encode(encodeSseEvent(event));
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 }); }
  const task = body && typeof body === "object" && !Array.isArray(body) ? parseAuditionTask((body as Record<string, unknown>).task) : null;
  if (!task) return Response.json({ ok: false, error: "A valid task and optional rules are required to discover agents." }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runDiscoveryStream({ task })) {
          if (request.signal.aborted) break;
          controller.enqueue(encode(event));
        }
      } catch {
        controller.enqueue(encode({ type: "warning", code: "search-unavailable", userMessage: "We’re having trouble searching the registry right now." }));
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
