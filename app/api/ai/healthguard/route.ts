import { NextResponse } from "next/server";
import { askHealthGuard } from "@/lib/camber";

export async function POST(request: Request) {
  try {
    const { question } = await request.json() as { question?: unknown };
    if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Ask HealthGuard a question first." }, { status: 400 });
    if (question.length > 800) return NextResponse.json({ error: "Keep questions under 800 characters." }, { status: 400 });
    return NextResponse.json(await askHealthGuard(question.trim()));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "HealthGuard could not answer right now." }, { status: 500 }); }
}
