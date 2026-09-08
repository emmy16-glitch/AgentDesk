import { createPublicClient, defineChain, http } from "viem";
import { validatePublicHttpsUrl } from "@/lib/network-safety";

export const BSC_MAINNET_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
const MAX_METADATA_BYTES = 256 * 1024;

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
  /** Legacy ERC-8004 metadata field. `services` takes precedence when present. */
  endpoints?: AgentService[];
  registrations?: Array<{ agentId?: number; agentRegistry?: string }>;
  supportedTrust?: string[];
  x402Support?: boolean;
  active?: boolean;
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
  metadataStatus: "resolved" | "unresolved" | "unsupported-uri" | "invalid-json" | "blocked-uri" | "too-large";
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
  if (Buffer.byteLength(uri, "utf8") > MAX_METADATA_BYTES * 2) return null;

  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const encoded = uri.slice("data:application/json;base64,".length);
      const decoded = Buffer.from(encoded, "base64");
      if (decoded.byteLength > MAX_METADATA_BYTES) return null;
      return JSON.parse(decoded.toString("utf8")) as AgentRegistrationMetadata;
    }

    if (uri.startsWith("data:application/json,")) {
      const encoded = uri.slice("data:application/json,".length);
      const decoded = decodeURIComponent(encoded);
      if (Buffer.byteLength(decoded, "utf8") > MAX_METADATA_BYTES) return null;
      return JSON.parse(decoded) as AgentRegistrationMetadata;
    }
  } catch {
    return null;
  }
  return null;
}

function metadataHttpUrl(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    const cidPath = uri.slice("ipfs://".length).replace(/^ipfs\//, "");
    return cidPath ? `https://ipfs.io/ipfs/${cidPath}` : null;
  }
  if (uri.startsWith("https://")) return uri;
  return null;
}

function normalizeServices(metadata: AgentRegistrationMetadata | null): AgentService[] {
  if (!metadata) return [];
  const entries = Array.isArray(metadata.services)
    ? metadata.services
    : Array.isArray(metadata.endpoints)
      ? metadata.endpoints
      : [];

  const seen = new Set<string>();
  return entries.flatMap((service) => {
    if (!service || typeof service !== "object") return [];
    const name = typeof service.name === "string" ? service.name.trim() : "";
    const endpoint = typeof service.endpoint === "string" ? service.endpoint.trim() : "";
    const version = typeof service.version === "string" ? service.version.trim() : undefined;
    if (!name || !endpoint) return [];

    const key = `${name.toLowerCase()}:${endpoint}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, endpoint, ...(version ? { version } : {}) }];
  });
}

async function resolveMetadata(agentUri: string): Promise<{
  metadata: AgentRegistrationMetadata | null;
  status: OnChainAgentIdentity["metadataStatus"];
}> {
  if (!agentUri) return { metadata: null, status: "unresolved" };

  if (agentUri.startsWith("data:application/json")) {
    if (Buffer.byteLength(agentUri, "utf8") > MAX_METADATA_BYTES * 2) {
      return { metadata: null, status: "too-large" };
    }
    const metadata = parseDataJson(agentUri);
    return { metadata, status: metadata ? "resolved" : "invalid-json" };
  }

  const candidateUrl = metadataHttpUrl(agentUri);
  if (!candidateUrl) return { metadata: null, status: "unsupported-uri" };

  const validation = await validatePublicHttpsUrl(candidateUrl);
  if (!validation.ok) return { metadata: null, status: "blocked-uri" };

  try {
    const response = await fetch(validation.url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AgentDesk-ERC8004-Metadata/1.0",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { metadata: null, status: "unresolved" };

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_METADATA_BYTES) {
      await response.body?.cancel().catch(() => undefined);
      return { metadata: null, status: "too-large" };
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_METADATA_BYTES) {
      return { metadata: null, status: "too-large" };
    }

    try {
      return { metadata: JSON.parse(text) as AgentRegistrationMetadata, status: "resolved" };
    } catch {
      return { metadata: null, status: "invalid-json" };
    }
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
