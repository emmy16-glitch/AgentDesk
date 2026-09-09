import type { AuditionTask } from "@/lib/auditions/types";

function words(value: string | undefined, limit = 5): string[] {
  return (value?.toLowerCase().match(/[a-z0-9]{3,24}/g) ?? []).slice(0, limit);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().replace(/\s+/g, " ")).filter(Boolean))];
}

export function planDiscoveryQueries(task: AuditionTask): string[] {
  const ruleProtocol = task.guardrails?.approvedProtocols?.[0];
  const promptTerms = words(task.instructions);

  if (task.category === "Health Factor Monitoring") {
    return unique([
      ["BNB Chain", "health factor", "liquidation", task.protocol, ruleProtocol].filter(Boolean).join(" "),
      ["lending risk", "collateral monitoring", task.protocol, ...promptTerms].filter(Boolean).join(" "),
      ["Venus", "health factor", "agent"].join(" "),
      "BNB Chain lending health monitoring agent",
      "liquidation monitoring A2A agent",
      "DeFi risk monitoring agent",
    ]).slice(0, 6);
  }

  if (task.category === "Yield Optimisation") {
    return unique([
      ["BNB Chain", task.asset, "yield optimisation", ruleProtocol].filter(Boolean).join(" "),
      [task.asset, "lending vault yield", ruleProtocol, ...promptTerms].filter(Boolean).join(" "),
      [task.asset, "yield farming agent"].filter(Boolean).join(" "),
      "BNB Chain stablecoin yield farming agent",
      "yield optimization A2A agent",
      "DeFi yield agent",
    ]).slice(0, 6);
  }

  if (task.category === "Grid Trading") {
    return unique([
      ["BNB Chain", task.pair, "grid trading", ruleProtocol].filter(Boolean).join(" "),
      [task.pair, "range strategy", "grid bot", ...promptTerms].filter(Boolean).join(" "),
      [task.pair, "trading agent"].filter(Boolean).join(" "),
      "BNB Chain automated grid trading agent",
      "grid trading A2A agent",
      "range trading agent",
    ]).slice(0, 6);
  }

  return unique([
    ["BNB Chain", "portfolio rebalancing", ruleProtocol].filter(Boolean).join(" "),
    ["allocation", "rebalance", task.objective, ...promptTerms].filter(Boolean).join(" "),
    ["portfolio", "rebalance", "agent"].join(" "),
    "BNB Chain liquidity position allocation agent",
    "portfolio rebalancing A2A agent",
    "asset allocation agent",
  ]).slice(0, 6);
}
