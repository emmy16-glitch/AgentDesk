import type { AuditionTask } from "@/lib/auditions/types";
import type { SupportedCommerceChainId } from "@/lib/erc8183";
import type { CanonicalNegotiationEnvelope } from "@/lib/hiring/erc8183-negotiation";
import type { QuoteSignatureMethod } from "@/lib/hiring/verify-erc8183-quote";

export interface Erc8183NegotiatedQuote {
  accepted: true;
  tokenId: number;
  provider: string;
  providerSource: "erc8004-agent-wallet";
  priceBaseUnits: string;
  currency: "$U";
  paymentToken: string;
  chainId: SupportedCommerceChainId;
  quoteExpiresAt: string | null;
  providerSignature: string;
  negotiationHash: string;
  signatureMethod: QuoteSignatureMethod;
  signatureCheckedAtBlock: string;
  verifyingContract: string;
  serviceEndpoint: string;
  negotiationEndpoint: string;
  transport: "HTTP" | "A2A";
  taskDescription: string;
  auditionReceiptHash: string;
  task: AuditionTask;
  checkedAt: string;
  envelope: CanonicalNegotiationEnvelope;
  raw: unknown;
}

export interface ProviderNotificationEvidence {
  status: "sent" | "not-required" | "unavailable";
  detail: string;
  checkedAt: string;
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
  fundBlock: string;
  provider: string;
  priceBaseUnits: string;
  fundedAt: string;
  providerNotification: ProviderNotificationEvidence;
}
