import type { ActionPolicy, DataPolicy, TaskGuardrails } from "@/lib/guardrails/types";

const actionLabels: Record<ActionPolicy, string> = {
  "analysis-only": "Only analyse",
  "propose-only": "Suggest what to do",
  "approval-required": "Ask me before any action",
};

const dataLabels: Record<DataPolicy, string> = {
  "task-only": "Only what is needed for this task",
  "public-wallet-only": "Public wallet information only",
};

export function actionPolicyLabel(policy: ActionPolicy): string {
  return actionLabels[policy];
}

export function dataPolicyLabel(policy: DataPolicy): string {
  return dataLabels[policy];
}

export function protocolRuleLabel(guardrails: TaskGuardrails): string {
  return guardrails.approvedProtocols?.length ? guardrails.approvedProtocols.join(", ") : "Any protocol";
}

export function rulesSummary(guardrails: TaskGuardrails, compact = false): string[] {
  const risk = guardrails.riskTolerance ? `${guardrails.riskTolerance[0].toUpperCase()}${guardrails.riskTolerance.slice(1)} risk` : null;
  const price = guardrails.maxPrice ? `Max ${guardrails.maxPrice.amount} ${guardrails.maxPrice.asset}` : null;
  const protocol = protocolRuleLabel(guardrails);
  const action = actionPolicyLabel(guardrails.actionPolicy);
  return compact
    ? [[risk, price].filter(Boolean).join(" · "), `${protocol} · ${action}`].filter(Boolean)
    : [risk, price, protocol, action].filter((value): value is string => Boolean(value));
}
