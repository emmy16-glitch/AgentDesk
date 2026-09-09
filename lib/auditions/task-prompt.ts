import type { AuditionTask } from "@/lib/auditions/types";

function optionalLine(label: string, value?: string): string[] {
  const clean = value?.trim();
  return clean ? [`${label}: ${clean}`] : [];
}

const STRUCTURED_BOUNDARY = [
  "Where your service can return machine-readable data, end the response with one JSON object under the key \"agentdesk\".",
  "Do not invent a field just to satisfy the schema. Use null or omit it when you cannot support the value with current evidence.",
  "The prose answer remains allowed; the JSON block exists so AgentDesk can independently compare reproducible claims against BNB state.",
];

export function buildAuditionPrompt(task: AuditionTask): string {
  const safety = [
    "This is a bounded read-only pre-hire audition.",
    "Do not execute trades, move funds, sign transactions, submit approvals, or make irreversible changes.",
    "Return only analysis, proposed parameters, supported capabilities, assumptions, current quote if available, and source/freshness information.",
    "If you cannot support the request with current evidence, say so explicitly.",
  ];

  switch (task.category) {
    case "Health Factor Monitoring":
      return [
        ...safety,
        "Task family: Health Factor Monitoring",
        `Wallet/account: ${task.wallet.trim()}`,
        ...optionalLine("Protocol", task.protocol),
        ...optionalLine("Monitoring goal", task.goal),
        ...optionalLine("Additional instructions", task.instructions),
        "Please state protocol coverage, what position/health-factor information you can currently observe, alert capability, assumptions, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        'Preferred machine-readable shape: {"agentdesk":{"protocol":"Venus","healthFactor":null,"shortfall":null,"liquidationRisk":"unknown"}}',
      ].join("\n");

    case "Yield Optimisation":
      return [
        ...safety,
        "Task family: Yield Optimisation",
        `Asset: ${task.asset.trim()}`,
        `Amount: ${task.amount.trim()}`,
        ...optionalLine("Risk preference", task.riskPreference),
        ...optionalLine("Additional instructions", task.instructions),
        "Please propose a read-only yield route/opportunity, supported protocol, estimated yield only when source-backed, assumptions/risks, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        'Preferred machine-readable shape: {"agentdesk":{"protocol":null,"venue":null,"pair":null,"poolAddress":null,"estimatedApyPct":null}}',
      ].join("\n");

    case "Grid Trading":
      return [
        ...safety,
        "Task family: Grid Trading",
        `Pair: ${task.pair.trim()}`,
        `Capital: ${task.capital.trim()}`,
        ...optionalLine("Price range", task.priceRange),
        ...optionalLine("Risk preference", task.riskPreference),
        ...optionalLine("Additional instructions", task.instructions),
        "Please propose grid parameters without placing orders, state supported venue, assumptions, live market context/source and timestamp, expected fees where supportable, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        'Preferred machine-readable shape: {"agentdesk":{"venue":null,"pair":null,"lowerPrice":null,"upperPrice":null,"gridCount":null,"feeTier":null}}',
      ].join("\n");

    case "Rebalancing":
      return [
        ...safety,
        "Task family: Rebalancing",
        `Portfolio/position: ${task.portfolio.trim()}`,
        `Objective: ${task.objective.trim()}`,
        ...optionalLine("Additional instructions", task.instructions),
        "Please propose allocation/range changes without executing them, list the actions you would take, supported protocol, assumptions, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        'Preferred machine-readable shape: {"agentdesk":{"protocol":null,"targetAllocations":{"BNB":60,"USDT":40}}}',
      ].join("\n");
  }
}
