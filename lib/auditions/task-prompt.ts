import type { AuditionTask } from "@/lib/auditions/types";
import { actionPolicyLabel, dataPolicyLabel, protocolRuleLabel } from "@/lib/guardrails/labels";
import { agentWalletPolicyPromptLines } from "@/lib/agent-wallets/policy";

function optionalLine(label: string, value?: string): string[] {
  const clean = value?.trim();
  return clean ? [`${label}: ${clean}`] : [];
}

const STRUCTURED_BOUNDARY = [
  "Where your service can return machine-readable data, end the response with one JSON object under the key \"agentdesk\".",
  "Do not invent a field just to satisfy the schema. Use null or omit it when you cannot support the value with current evidence.",
  "The prose answer remains allowed; the JSON block exists so AgentDesk can independently compare reproducible claims against BNB state.",
  "When relevant, include protocol, price, priceAsset, riskLevel and requiresExecution under agentdesk.",
  "If this agent actually uses a named agent-side wallet provider, you may also include walletProvider, walletPolicyEnforced and humanApprovalRequired. These are provider claims, not AgentDesk verification. Null or omission is better than an invented value.",
];

function guardrailLines(task: AuditionTask): string[] {
  const guardrails = task.guardrails;
  if (!guardrails) return [];
  return [
    "User rules:",
    guardrails.riskTolerance ? `Risk tolerance: ${guardrails.riskTolerance}` : null,
    guardrails.maxPrice ? `Maximum hire price: ${guardrails.maxPrice.amount} ${guardrails.maxPrice.asset}` : null,
    `Approved protocols: ${protocolRuleLabel(guardrails)}`,
    `Action permission: ${actionPolicyLabel(guardrails.actionPolicy)}. Do not execute anything; AgentDesk requires approval before any action.`,
    `Data access: ${dataPolicyLabel(guardrails.dataPolicy)}.`,
  ].filter((line): line is string => Boolean(line));
}

const WALLET_FIELDS = '"walletProvider":null,"walletPolicyEnforced":null,"humanApprovalRequired":null';

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
        ...guardrailLines(task),
        ...agentWalletPolicyPromptLines(task),
        "Please state protocol coverage, what position/health-factor information you can currently observe, alert capability, assumptions, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        `Preferred machine-readable shape: {"agentdesk":{"protocol":"Venus","price":null,"priceAsset":null,"riskLevel":null,"requiresExecution":null,${WALLET_FIELDS},"healthFactor":null,"shortfall":null,"liquidationRisk":"unknown"}}`,
      ].join("\n");

    case "Yield Optimisation":
      return [
        ...safety,
        "Task family: Yield Optimisation",
        `Asset: ${task.asset.trim()}`,
        `Amount: ${task.amount.trim()}`,
        ...optionalLine("Risk preference", task.riskPreference),
        ...optionalLine("Additional instructions", task.instructions),
        ...guardrailLines(task),
        ...agentWalletPolicyPromptLines(task),
        "Please propose a read-only yield route/opportunity, supported protocol, estimated yield only when source-backed, assumptions/risks, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        `Preferred machine-readable shape: {"agentdesk":{"protocol":null,"price":null,"priceAsset":null,"riskLevel":null,"requiresExecution":null,${WALLET_FIELDS},"venue":null,"pair":null,"poolAddress":null,"estimatedApyPct":null}}`,
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
        ...guardrailLines(task),
        ...agentWalletPolicyPromptLines(task),
        "Please propose grid parameters without placing orders, state supported venue, assumptions, live market context/source and timestamp, expected fees where supportable, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        `Preferred machine-readable shape: {"agentdesk":{"protocol":null,"price":null,"priceAsset":null,"riskLevel":null,"requiresExecution":null,${WALLET_FIELDS},"venue":null,"pair":null,"lowerPrice":null,"upperPrice":null,"gridCount":null,"feeTier":null}}`,
      ].join("\n");

    case "Rebalancing":
      return [
        ...safety,
        "Task family: Rebalancing",
        `Portfolio/position: ${task.portfolio.trim()}`,
        `Objective: ${task.objective.trim()}`,
        ...optionalLine("Additional instructions", task.instructions),
        ...guardrailLines(task),
        ...agentWalletPolicyPromptLines(task),
        "Please propose allocation/range changes without executing them, list the actions you would take, supported protocol, assumptions, data source/timestamp, and quote if one exists.",
        ...STRUCTURED_BOUNDARY,
        `Preferred machine-readable shape: {"agentdesk":{"protocol":null,"price":null,"priceAsset":null,"riskLevel":null,"requiresExecution":null,${WALLET_FIELDS},"targetAllocations":{"BNB":60,"USDT":40}}}`,
      ].join("\n");
  }
}
