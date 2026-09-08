import { createPublicClient, defineChain, http } from "viem";

export const BSC_MAINNET_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const bscMainnet = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.BSC_MAINNET_RPC_URL?.trim() || "https://bsc-dataseed.binance.org"],
    },
  },
  blockExplorers: { default: { name: "BscScan", url: "https://bscscan.com" } },
});

const identityRegistryAbi = [
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
}

export interface AgentRegistrationMetadata {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: AgentService[];
  registrations?: Array<{ agentId?: number; agentRegistry?: string }>;
  supportedTrust?: string[];
  [key: string]: unknown;
}

export interface OnChainAgentIdentity {
  chainId: 56;
  tokenId: number;
  registryAddress: typeof BSC_MAINNET_IDENTITY_REGISTRY;
  owner: string;
  agentWallet: string | null;
  agentUri: string;
  metadata: AgentRegistrationMetadata | null;
  metadataStatus: "resolved" | "unresolved" | "unsupported-uri" | "invalid-json";
  services: AgentService[];
  checkedAt: string;
  explorerUrl: string;
}

function publicClient() {
  return createPublicClient({
    chain: bscMainnet,
    transport: http(bscMainnet.rpcUrls.default.http[0], { timeout: 8_000 }),
  });
}

function parseDataJson(uri: string): AgentRegistrationMetadata | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const encoded = uri.slice("data:application/json;base64,".length);
      return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as AgentRegistrationMetadata;
    }

    if (uri.startsWith("data:application/json,")) {
      const encoded = uri.slice("data:application/json,".length);
      return JSON.parse(decodeURIComponent(encoded)) as AgentRegistrationMetadata;
    }
  } catch {
    return null;
  }
  return null;
}

function metadataHttpUrl(uri: string): string | null {
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`;
  if (uri.startsWith("https://")) return uri;
  return null;
}

function normalizeServices(metadata: AgentRegistrationMetadata | null): AgentService[] {
  if (!metadata || !Array.isArray(metadata.services)) return [];
  return metadata.services.flatMap((service) => {
    if (!service || typeof service !== "object") return [];
    const name = typeof service.name === "string" ? service.name.trim() : "";
    const endpoint = typeof service.endpoint === "string" ? service.endpoint.trim() : "";
    const version = typeof service.version === "string" ? service.version.trim() : undefined;
    return name && endpoint ? [{ name, endpoint, ...(version ? { version } : {}) }] : [];
  });
}

async function resolveMetadata(agentUri: string): Promise<{
  metadata: AgentRegistrationMetadata | null;
  status: OnChainAgentIdentity["metadataStatus"];
}> {
  if (!agentUri) return { metadata: null, status: "unresolved" };

  if (agentUri.startsWith("data:application/json")) {
    const metadata = parseDataJson(agentUri);
    return { metadata, status: metadata ? "resolved" : "invalid-json" };
  }

  const url = metadataHttpUrl(agentUri);
  if (!url) return { metadata: null, status: "unsupported-uri" };

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return { metadata: null, status: "unresolved" };
    const metadata = (await response.json()) as AgentRegistrationMetadata;
    return { metadata, status: "resolved" };
  } catch {
    return { metadata: null, status: "unresolved" };
  }
}

export async function resolveOnChainAgentIdentity(tokenId: number): Promise<OnChainAgentIdentity> {
  if (!Number.isSafeInteger(tokenId) || tokenId < 0) throw new Error("Invalid ERC-8004 token ID");

  const client = publicClient();
  const [agentUri, owner, walletResult] = await Promise.all([
    client.readContract({
      address: BSC_MAINNET_IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    }),
    client.readContract({
      address: BSC_MAINNET_IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    }),
    client.readContract({
      address: BSC_MAINNET_IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: "getAgentWallet",
      args: [BigInt(tokenId)],
    }).catch(() => null),
  ]);

  const resolved = await resolveMetadata(agentUri);
  const services = normalizeServices(resolved.metadata);

  return {
    chainId: 56,
    tokenId,
    registryAddress: BSC_MAINNET_IDENTITY_REGISTRY,
    owner,
    agentWallet: walletResult && walletResult !== "0x0000000000000000000000000000000000000000" ? walletResult : null,
    agentUri,
    metadata: resolved.metadata,
    metadataStatus: resolved.status,
    services,
    checkedAt: new Date().toISOString(),
    explorerUrl: `https://8004scan.io/agents/bsc/${tokenId}`,
  };
}
