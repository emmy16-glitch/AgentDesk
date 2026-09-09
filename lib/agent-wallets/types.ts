import type { HireCapabilityPolicy } from "@/lib/capabilities/types";
import type { TaskGuardrails } from "@/lib/guardrails/types";

export type AgentWalletProviderKind = "turnkey" | "twak" | "altana" | "evm" | "unknown";
export type AgentWalletAdvertisementSource = "erc8004-metadata" | "a2a-agent-card";

/**
 * An explicit wallet-infrastructure claim published by the agent/operator.
 * This is advertisement evidence only: it does not prove that a particular
 * provider-side policy is configured, active, or enforced for a later job.
 */
export interface AgentWalletAdvertisement {
  provider: AgentWalletProviderKind;
  providerLabel: string;
  source: AgentWalletAdvertisementSource;
  sourceField: string;
  advertisedCapabilities: string[];
  policyConfigured: boolean | null;
  humanApprovalConfigured: boolean | null;
}

/** Platform-level capabilities AgentDesk knows about a wallet provider. */
export interface AgentWalletProviderProfile {
  kind: AgentWalletProviderKind;
  label: string;
  custody: "remote-enclave" | "external-wallet" | "onchain-session" | "local-key" | "unknown";
  externalPolicyEngineCapable: boolean;
  humanApprovalCapable: boolean;
  crossChainCapable: boolean;
  erc8183Capable: boolean;
  b402Capable: boolean | null;
  proofBoundary: string;
}

/**
 * A provider-neutral description of the user's task and execution boundary
 * that can be handed to an agent-side wallet/policy system. It is not itself
 * a Turnkey/TWAK/Altana policy and must never be labelled as enforced until
 * the provider supplies independent evidence of enforcement.
 */
export interface AgentWalletPolicyRequest {
  version: "agentdesk-agent-wallet-policy-v1";
  chainId: 56;
  readOnlyAudition: true;
  actionPolicy: TaskGuardrails["actionPolicy"];
  dataPolicy: TaskGuardrails["dataPolicy"];
  riskTolerance?: TaskGuardrails["riskTolerance"];
  maxPrice?: TaskGuardrails["maxPrice"];
  approvedProtocols: string[];
  humanApprovalRequiredForExecution: boolean;
  /** Final-hire capability permissions selected by the user, if supplied. */
  hireCapabilities?: HireCapabilityPolicy;
}
