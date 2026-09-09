import type { AuditionTask } from "@/lib/auditions/types";
import { actionPolicyLabel, dataPolicyLabel, protocolRuleLabel } from "@/lib/guardrails/labels";

function describeGuardrails(task: AuditionTask): string | null {
  const guardrails = task.guardrails;
  if (!guardrails) return null;
  return [
    guardrails.riskTolerance ? `risk=${guardrails.riskTolerance}` : null,
    guardrails.maxPrice ? `maxHirePrice=${guardrails.maxPrice.amount} ${guardrails.maxPrice.asset}` : null,
    `approvedProtocols=${protocolRuleLabel(guardrails)}`,
    `permission=${actionPolicyLabel(guardrails.actionPolicy)}`,
    `data=${dataPolicyLabel(guardrails.dataPolicy)}`,
  ].filter(Boolean).join("; ");
}

export function describeHireTask(task: AuditionTask): string {
  if (task.category === "Health Factor Monitoring") {
    return [
      `Health Factor Monitoring for ${task.wallet}`,
      task.protocol ? `protocol=${task.protocol}` : null,
      task.goal ? `goal=${task.goal}` : null,
      task.instructions ? `constraints=${task.instructions}` : null,
      describeGuardrails(task),
    ].filter(Boolean).join(" | ");
  }

  if (task.category === "Yield Optimisation") {
    return [
      `Yield Optimisation for ${task.amount} ${task.asset}`,
      task.riskPreference ? `risk=${task.riskPreference}` : null,
      task.instructions ? `constraints=${task.instructions}` : null,
      describeGuardrails(task),
    ].filter(Boolean).join(" | ");
  }

  if (task.category === "Grid Trading") {
    return [
      `Grid Trading plan for ${task.pair} with ${task.capital}`,
      task.priceRange ? `range=${task.priceRange}` : null,
      task.riskPreference ? `risk=${task.riskPreference}` : null,
      task.instructions ? `constraints=${task.instructions}` : null,
      describeGuardrails(task),
    ].filter(Boolean).join(" | ");
  }

  return [
    `Rebalancing for ${task.portfolio}`,
    `objective=${task.objective}`,
    task.instructions ? `constraints=${task.instructions}` : null,
    describeGuardrails(task),
  ].filter(Boolean).join(" | ");
}
