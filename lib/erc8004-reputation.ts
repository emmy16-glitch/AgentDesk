import { type Address, type Hex } from "viem";

export const ERC8004_REPUTATION_REGISTRY: Record<56 | 97, Address> = {
  56: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  97: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
};

export const erc8004ReputationAbi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getIdentityRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export interface VerifiedCompletionFeedback {
  agentId: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: "agentdesk-job-completed";
  tag2: string;
  endpoint: string;
  feedbackURI: string;
  feedbackHash: Hex;
}

export function completionFeedback(args: {
  agentId: number;
  category: string;
  endpoint?: string | null;
  receiptHash: Hex;
}): VerifiedCompletionFeedback {
  return {
    agentId: BigInt(args.agentId),
    value: BigInt(1),
    valueDecimals: 0,
    tag1: "agentdesk-job-completed",
    tag2: args.category,
    endpoint: args.endpoint ?? "",
    feedbackURI: "",
    feedbackHash: args.receiptHash,
  };
}
