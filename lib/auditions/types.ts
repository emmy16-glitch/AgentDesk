import type { MarketplaceCategory } from "@/lib/8004scan";
import type { TaskGuardrails } from "@/lib/guardrails/types";
import type { AgentWalletAdvertisement } from "@/lib/agent-wallets/types";

export type AuditionStatus = "completed" | "unsupported" | "timeout" | "error";
export type TaskFitLabel = "BEST FIT" | "STRONG FIT" | "PARTIAL FIT" | "NOT ENOUGH EVIDENCE";

interface BaseAuditionTask {
  category: MarketplaceCategory;
  instructions?: string;
  guardrails?: TaskGuardrails;
}

export interface HealthFactorAuditionTask extends BaseAuditionTask {
  category: "Health Factor Monitoring";
  wallet: string;
  protocol?: string;
  goal?: string;
}

export interface YieldAuditionTask extends BaseAuditionTask {
  category: "Yield Optimisation";
  asset: string;
  amount: string;
  riskPreference?: string;
}

export interface GridTradingAuditionTask extends BaseAuditionTask {
  category: "Grid Trading";
  pair: string;
  capital: string;
  priceRange?: string;
  riskPreference?: string;
}

export interface RebalancingAuditionTask extends BaseAuditionTask {
  category: "Rebalancing";
  portfolio: string;
  objective: string;
}

export type AuditionTask =
  | HealthFactorAuditionTask
  | YieldAuditionTask
  | GridTradingAuditionTask
  | RebalancingAuditionTask;

export interface AuditionRequest {
  tokenId: number;
  task: AuditionTask;
}

export interface AuditionQuote {
  amount: string;
  asset: string;
  expiresAt?: string;
  source?: string;
}

export interface AuditionEvidence {
  kind: "identity" | "agent-card" | "wallet-infrastructure" | "service-response" | "quote";
  source: string;
  observedAt: string;
  summary: string;
  raw?: unknown;
}

export interface TaskFitExplanation {
  label: TaskFitLabel;
  reasons: string[];
  missingEvidence: string[];
}

export interface AuditionCandidate {
  chainId: 56;
  tokenId: number;
  registry: "ERC-8004";
  registryAddress: string;
  owner: string;
  agentWallet: string | null;
  /** Explicit provider advertisement only; not proof of active wallet policy. */
  walletInfrastructure?: AgentWalletAdvertisement | null;
  sourceUrl: string;
}

export interface AuditionResult {
  candidate: AuditionCandidate;
  task: AuditionTask;
  status: AuditionStatus;
  protocol: "A2A" | null;
  latencyMs: number | null;
  checkedAt: string;
  quote: AuditionQuote | null;
  output: string | null;
  evidence: AuditionEvidence[];
  taskFit: TaskFitExplanation;
  error?: string;
}
