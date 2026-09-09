import type { DiscoveryStreamEvent } from "@/lib/discovery/types";

export function encodeSseEvent(event: DiscoveryStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Extract complete SSE frames while retaining an incomplete trailing frame for
 * the next ReadableStream chunk. Discovery owns both ends of this stream, so
 * malformed frames are ignored rather than exposed to the product UI.
 */
export function parseSseFrames(buffer: string): { events: DiscoveryStreamEvent[]; remainder: string } {
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";
  const events: DiscoveryStreamEvent[] = [];
  for (const frame of frames) {
    const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
    if (!data) continue;
    try { events.push(JSON.parse(data) as DiscoveryStreamEvent); } catch { /* ignore malformed frames */ }
  }
  return { events, remainder };
}
