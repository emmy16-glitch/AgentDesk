import { NextRequest, NextResponse } from "next/server";
import { runAudition } from "@/lib/auditions/engine";
import type { AuditionRequest, AuditionTask } from "@/lib/auditions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown, maxLength = 1000): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : undefined;
}

function parseTask(value: unknown): AuditionTask | null {
  const task = record(value);
  if (!task) return null;

  const category = cleanString(task.category, 80);
  const instructions = cleanString(task.instructions, 2000);

  if (category === "Health Factor Monitoring") {
    const wallet = cleanString(task.wallet, 200);
    if (!wallet) return null;
    return {
      category,
      wallet,
      ...(cleanString(task.protocol, 200) ? { protocol: cleanString(task.protocol, 200) } : {}),
      ...(cleanString(task.goal, 1000) ? { goal: cleanString(task.goal, 1000) } : {}),
      ...(instructions ? { instructions } : {}),
    };
  }

  if (category === "Yield Optimisation") {
    const asset = cleanString(task.asset, 100);
    const amount = cleanString(task.amount, 100);
    if (!asset || !amount) return null;
    return {
      category,
      asset,
      amount,
      ...(cleanString(task.riskPreference, 500) ? { riskPreference: cleanString(task.riskPreference, 500) } : {}),
      ...(instructions ? { instructions } : {}),
    };
  }

  if (category === "Grid Trading") {
    const pair = cleanString(task.pair, 100);
    const capital = cleanString(task.capital, 100);
    if (!pair || !capital) return null;
    return {
      category,
      pair,
      capital,
      ...(cleanString(task.priceRange, 200) ? { priceRange: cleanString(task.priceRange, 200) } : {}),
      ...(cleanString(task.riskPreference, 500) ? { riskPreference: cleanString(task.riskPreference, 500) } : {}),
      ...(instructions ? { instructions } : {}),
    };
  }

  if (category === "Rebalancing") {
    const portfolio = cleanString(task.portfolio, 1000);
    const objective = cleanString(task.objective, 1000);
    if (!portfolio || !objective) return null;
    return {
      category,
      portfolio,
      objective,
      ...(instructions ? { instructions } : {}),
    };
  }

  return null;
}

function parseRequest(value: unknown): AuditionRequest | null {
  const body = record(value);
  if (!body) return null;

  const tokenId = Number(body.tokenId);
  const task = parseTask(body.task);
  if (!Number.isSafeInteger(tokenId) || tokenId < 0 || !task) return null;
  return { tokenId, task };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const auditionRequest = parseRequest(body);
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
