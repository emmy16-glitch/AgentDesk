import type { HireCapabilityPolicy } from "@/lib/capabilities/types";
import type { AuditionTask } from "@/lib/auditions/types";
import type { AgentWalletPolicyRequest } from "@/lib/agent-wallets/types";

export function buildAgentWalletPolicyRequest(
  task: AuditionTask,
  hireCapabilities?: HireCapabilityPolicy,
): AgentWalletPolicyRequest | null {
  const guardrails = task.guardrails;
  if (!guardrails) return null;

  return {
    version: "agentdesk-agent-wallet-policy-v1",
    chainId: 56,
    readOnlyAudition: true,
    actionPolicy: guardrails.actionPolicy,
    dataPolicy: guardrails.dataPolicy,
    ...(guardrails.riskTolerance ? { riskTolerance: guardrails.riskTolerance } : {}),
    ...(guardrails.maxPrice ? { maxPrice: guardrails.maxPrice } : {}),
    approvedProtocols: [...(guardrails.approvedProtocols ?? [])],
    humanApprovalRequiredForExecution: guardrails.actionPolicy === "approval-required",
    ...(hireCapabilities ? { hireCapabilities } : {}),
  };
}

export function agentWalletPolicyPromptLines(task: AuditionTask): string[] {
  const policy = buildAgentWalletPolicyRequest(task);
  if (!policy) return [];

  return [
    "Agent-side wallet boundary:",
    "The audition itself is read-only and must not sign, broadcast, approve, trade, move funds or create an irreversible action.",
    "Do not initiate paid B402/x402 tool calls during the audition. Paid intelligence permissions, if any, are selected only at the final hire stage.",
    "If your agent uses a wallet provider with policy controls (for example Turnkey, TWAK or Altana), state the provider only when it is actually configured for this agent.",
    "If you claim that an out-of-model wallet policy enforces these rules, include machine-readable policy evidence only when that policy is genuinely configured; otherwise return null/omit it.",
    `Requested task policy boundary: ${JSON.stringify(policy)}`,
  ];
}
