const baseUrl = process.env.AGENTDESK_BASE_URL || "http://127.0.0.1:3000";

// These IDs are audit-only live smoke candidates, not marketplace inventory.
// AgentDesk still resolves every identity and advertised service from ERC-8004 at run time.
const yieldTask = {
  category: "Yield Optimisation",
  asset: "USDC",
  amount: "500",
  riskPreference: "moderate",
  instructions: "Read-only audition. Give a current BNB Chain yield proposal with sources/assumptions. Do not execute anything.",
};
const gridTask = {
  category: "Grid Trading",
  pair: "WBNB/USDT",
  capital: "500 USDT",
  riskPreference: "moderate",
  instructions: "Read-only audition. Propose grid parameters and current market assumptions. Do not place orders.",
};
const rebalanceTask = {
  category: "Rebalancing",
  portfolio: "BNB/USDT PancakeSwap V3 position",
  objective: "Propose a safer range/allocation adjustment without executing it.",
  instructions: "Read-only audition. Return a proposal, assumptions, current evidence and any quote. Do not execute anything.",
};

const attempts = [
  { tokenId: 302258, label: "Brain on BNB grid planner audit candidate", task: gridTask },
  { tokenId: 304493, label: "Brain on BNB yield ranking audit candidate", task: yieldTask },
  { tokenId: 6443, label: "Sperax Intelligence yield audit candidate", task: yieldTask },
  { tokenId: 265375, label: "BNB LP Range Rebalancer audit candidate", task: rebalanceTask },
  { tokenId: 269233, label: "BNB Grid Trader audit candidate", task: gridTask },
  { tokenId: 265876, label: "BNB Yield Optimizer audit candidate", task: yieldTask },
  { tokenId: 266232, label: "PositionCrew yield audit candidate", task: yieldTask },
  { tokenId: 172801, label: "DeFiBot grid audit candidate", task: gridTask },
  { tokenId: 266234, label: "PositionCrew grid audit candidate", task: gridTask },
];

const summaries = [];
let completed = null;

for (const attempt of attempts) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/auditions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: attempt.tokenId, task: attempt.task }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json();
    const result = body?.result;
    const summary = {
      tokenId: attempt.tokenId,
      label: attempt.label,
      httpStatus: response.status,
      ok: body?.ok === true,
      auditionStatus: result?.status ?? null,
      protocol: result?.protocol ?? null,
      latencyMs: result?.latencyMs ?? null,
      evidenceCount: Array.isArray(result?.evidence) ? result.evidence.length : 0,
      quoteReturned: Boolean(result?.quote),
      outputReturned: typeof result?.output === "string" && result.output.trim().length > 0,
      taskFit: result?.taskFit?.label ?? null,
      error: result?.error ?? body?.error ?? null,
      elapsedMs: Date.now() - started,
    };
    summaries.push(summary);
    console.log(`[live-audition] ${JSON.stringify(summary)}`);

    if (summary.auditionStatus === "completed" && summary.outputReturned) {
      completed = summary;
      break;
    }
  } catch (error) {
    const summary = {
      tokenId: attempt.tokenId,
      label: attempt.label,
      auditionStatus: "request-error",
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - started,
    };
    summaries.push(summary);
    console.log(`[live-audition] ${JSON.stringify(summary)}`);
  }
}

console.log(`[live-audition-summary] ${JSON.stringify({ completed, attempts: summaries })}`);

if (!completed) {
  console.error("No audit candidate completed a real task-specific audition. Phase 2 live gate remains open.");
  process.exit(1);
}

console.log(`Phase 2 live gate passed with ERC-8004 #${completed.tokenId}.`);
