import type { AuditionTask } from "@/lib/auditions/types";
import type { SupportedCommerceChainId } from "@/lib/erc8183";

export interface Erc8183NegotiatedQuote {
  accepted: boolean;
  tokenId: number;
  provider: string;
  providerSource: "erc8004-agent-wallet" | "negotiation-response";
  priceBaseUnits: string;
  currency: string;
  chainId: SupportedCommerceChainId;
  quoteExpiresAt: string | null;
  providerSignature: string | null;
  verifyingContract: string | null;
  serviceEndpoint: string;
  negotiationEndpoint: string;
  taskDescription: string;
  task: AuditionTask;
  checkedAt: string;
  raw: unknown;
}

export interface Erc8183JobEvidence {
  jobId: string;
  chainId: SupportedCommerceChainId;
  receiptHash: string;
  createTx: string;
  registerTx: string;
  budgetTx: string;
  approvalTx?: string;
  fundTx: string;
  provider: string;
  priceBaseUnits: string;
  fundedAt: string;
}
