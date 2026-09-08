import { NextResponse } from "next/server";
import { getAgent } from "@/data/agents";
import { chatWithCamber } from "@/lib/camber";

export const runtime = "nodejs";

const unavailableMessage = "Unable to reach HealthGuard AI. Please try again.";

export async function POST(request: Request) {
  let body: { message?: unknown; conversationId?: unknown; agentId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  const agentId = typeof body.agentId === "string" ? body.agentId : "healthguard-ai";

  if (!message || message.length > 4_000) {
    return NextResponse.json({ error: "Please send a message between 1 and 4,000 characters." }, { status: 400 });
  }

  const agent = getAgent(agentId);
  if (!agent?.camberAgent) {
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }

  try {
    const response = await chatWithCamber({ agentId: agent.id, agentTag: agent.camberAgent, message, conversationId });
    return NextResponse.json(response);
  } catch {
    // Do not return CLI errors: they may contain implementation details or credentials.
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }
}
