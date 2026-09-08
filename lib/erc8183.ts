import { keccak256, toHex, type Address, type Hex } from "viem";

export type SupportedCommerceChainId = 56 | 97;

export interface Erc8183Deployment {
  chainId: SupportedCommerceChainId;
  name: string;
  commerce: Address;
  router: Address;
  policy: Address;
  paymentToken: Address;
  explorer: string;
}

export const ERC8183_DEPLOYMENTS: Record<SupportedCommerceChainId, Erc8183Deployment> = {
  56: {
    chainId: 56,
    name: "BNB Smart Chain",
    commerce: "0xea4daa3100a767e86fded867729ae7446476eba6",
    router: "0x51895229e12f9876011789b04f8698af06ccd6da",
    policy: "0x9c01845705b3078aa2e8cff7520a6376fd766de5",
    paymentToken: "0xce24439f2d9c6a2289f741120fe202248b666666",
    explorer: "https://bscscan.com",
  },
  97: {
    chainId: 97,
    name: "BNB Smart Chain Testnet",
    commerce: "0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE",
    router: "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25",
    policy: "0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6",
    paymentToken: "0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565",
    explorer: "https://testnet.bscscan.com",
  },
};

export const EMPTY_BYTES = "0x" as Hex;

export const erc8183CommerceAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setBudget",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "expectedBudget", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [{
      name: "job",
      type: "tuple",
      components: [
        { name: "id", type: "uint256" },
        { name: "client", type: "address" },
        { name: "provider", type: "address" },
        { name: "evaluator", type: "address" },
        { name: "description", type: "string" },
        { name: "budget", type: "uint256" },
        { name: "expiredAt", type: "uint256" },
        { name: "status", type: "uint8" },
        { name: "hook", type: "address" },
      ],
    }],
  },
  {
    type: "function",
    name: "paymentToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const erc8183RouterAbi = [
  {
    type: "function",
    name: "registerJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "policy", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const erc20PaymentAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const JOB_CREATED_TOPIC = keccak256(toHex("JobCreated(uint256,address,address,address,uint256,address)"));

export const JOB_STATUS_LABELS = [
  "OPEN",
  "FUNDED",
  "SUBMITTED",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
] as const;

export function isSupportedCommerceChainId(value: number): value is SupportedCommerceChainId {
  return value === 56 || value === 97;
}

export function commerceExplorerTx(chainId: SupportedCommerceChainId, hash: string) {
  return `${ERC8183_DEPLOYMENTS[chainId].explorer}/tx/${hash}`;
}

export function commerceExplorerAddress(chainId: SupportedCommerceChainId, address: string) {
  return `${ERC8183_DEPLOYMENTS[chainId].explorer}/address/${address}`;
}
