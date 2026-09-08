const SCAN_BASE_URL = "https://8004scan.io/api/v1/public";
export const BSC_MAINNET_CHAIN_ID = 56;

export type MarketplaceCategory =
  | "Health Factor Monitoring"
  | "Yield Optimisation"
  | "Grid Trading"
  | "Rebalancing";

export interface ScanAgent {
  id?: string;
  agent_id?: string;
  token_id: number;
  chain_id: number;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  owner_address?: string | null;
  supported_protocols?: string[] | null;
  total_score?: number | null;
  star_count?: number | null;
  total_feedbacks?: number | null;
  created_at?: string | null;
  tags?: string[] | string | null;
  [key: string]: unknown;
}

interface ScanMeta {
  version?: string;
  timestamp?: string;
  requestId?: string;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

interface ScanResponse<T> {
  success: boolean;
  data: T;
  meta?: ScanMeta;
  error?: { code?: string; message?: string };
}

export interface DiscoveredAgent {
  registry: "ERC-8004";
  chainId: 56;
  tokenId: number;
  agentId: string;
  name: string;
  description: string;
  ownerAddress: string | null;
  protocols: string[];
  sourceScore: number | null;
  feedbackCount: number | null;
  starCount: number | null;
  registeredAt: string | null;
  sourceUrl: string;
  source: "8004scan";
  sourceCheckedAt: string;
  category: MarketplaceCategory | null;
  categories: MarketplaceCategory[];
  categoryEvidence: Partial<Record<MarketplaceCategory, string[]>>;
  operationalStatus: "registry-listed";
}

const CATEGORY_TERMS: Record<MarketplaceCategory, string[]> = {
  "Health Factor Monitoring": [
    "health factor", "liquidation", "lending", "borrow", "venus", "lista", "collateral",
  ],
  "Yield Optimisation": [
    "yield", "apy", "apr", "liquidity", "vault", "farm", "staking", "yield optimization", "yield optimisation",
  ],
  "Grid Trading": [
    "grid trading", "grid-trading", "grid strategy", "grid bot", "automated grid", "range trading",
  ],
  Rebalancing: [
    "rebalance", "rebalancing", "portfolio allocation", "lp range", "liquidity position", "asset allocation",
  ],
};

const CATEGORY_SEARCH_QUERIES: Record<MarketplaceCategory, string> = {
  "Health Factor Monitoring": "BNB Chain health factor liquidation lending monitoring Venus Lista",
  "Yield Optimisation": "BNB Chain yield optimisation APR APY liquidity vault farming",
  "Grid Trading": "BNB Chain grid trading automated grid strategy",
  Rebalancing: "BNB Chain portfolio rebalancing LP range asset allocation",
};

function headers(): HeadersInit {
  const apiKey = process.env.SCAN8004_API_KEY?.trim();
  return apiKey ? { "X-API-Key": apiKey } : {};
}

async function scanFetch<T>(path: string): Promise<ScanResponse<T>> {
  const response = await fetch(`${SCAN_BASE_URL}${path}`, {
    headers: headers(),
    next: { revalidate: 300 },
  });

  const body = (await response.json()) as ScanResponse<T>;
  if (!response.ok || !body.success) {
    const message = body.error?.message || `8004scan request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tagText(tags: ScanAgent["tags"]): string {
  if (Array.isArray(tags)) return tags.filter((tag): tag is string => typeof tag === "string").join(" ");
  return normalizeText(tags);
}

export function classifyAgent(agent: ScanAgent): {
  category: MarketplaceCategory | null;
  categories: MarketplaceCategory[];
  evidence: Partial<Record<MarketplaceCategory, string[]>>;
} {
  const haystack = `${normalizeText(agent.name)} ${normalizeText(agent.description)} ${tagText(agent.tags)}`.toLowerCase();
  const evidence: Partial<Record<MarketplaceCategory, string[]>> = {};
  let primary: { category: MarketplaceCategory; hits: string[] } | null = null;

  for (const [category, terms] of Object.entries(CATEGORY_TERMS) as [MarketplaceCategory, string[]][]) {
    const hits = terms.filter((term) => haystack.includes(term));
    if (hits.length) evidence[category] = hits;
    if (hits.length && (!primary || hits.length > primary.hits.length)) primary = { category, hits };
  }

  const categories = (Object.keys(evidence) as MarketplaceCategory[]).filter((category) => (evidence[category]?.length ?? 0) > 0);
  return { category: primary?.category ?? null, categories, evidence };
}

export function normalizeAgent(agent: ScanAgent, checkedAt: string): DiscoveredAgent {
  const classification = classifyAgent(agent);
  const tokenId = Number(agent.token_id);
  const fallbackName = Number.isFinite(tokenId) ? `ERC-8004 Agent #${tokenId}` : "ERC-8004 Agent";

  return {
    registry: "ERC-8004",
    chainId: BSC_MAINNET_CHAIN_ID,
    tokenId,
    agentId: normalizeText(agent.agent_id) || `${BSC_MAINNET_CHAIN_ID}:${tokenId}`,
    name: normalizeText(agent.name) || fallbackName,
    description: normalizeText(agent.description) || "No description published in the indexed ERC-8004 record.",
    ownerAddress: normalizeText(agent.owner_address) || null,
    protocols: Array.isArray(agent.supported_protocols)
      ? agent.supported_protocols.filter((item): item is string => typeof item === "string")
      : [],
    sourceScore: typeof agent.total_score === "number" ? agent.total_score : null,
    feedbackCount: typeof agent.total_feedbacks === "number" ? agent.total_feedbacks : null,
    starCount: typeof agent.star_count === "number" ? agent.star_count : null,
    registeredAt: normalizeText(agent.created_at) || null,
    sourceUrl: `https://8004scan.io/agents/bsc/${tokenId}`,
    source: "8004scan",
    sourceCheckedAt: checkedAt,
    category: classification.category,
    categories: classification.categories,
    categoryEvidence: classification.evidence,
    // Registry presence proves identity registration, not endpoint reachability.
    operationalStatus: "registry-listed",
  };
}

export async function listBscAgents(limit = 20): Promise<{
  agents: DiscoveredAgent[];
  checkedAt: string;
  upstreamTimestamp: string | null;
  total: number | null;
}> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const result = await scanFetch<ScanAgent[]>(
    `/agents?chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}&sortBy=total_score&sortOrder=desc&isTestnet=false`,
  );
  const checkedAt = new Date().toISOString();

  return {
    agents: result.data.map((agent) => normalizeAgent(agent, checkedAt)),
    checkedAt,
    upstreamTimestamp: result.meta?.timestamp ?? null,
    total: result.meta?.pagination?.total ?? null,
  };
}

export async function searchBscAgents(
  category: MarketplaceCategory,
  limit = 10,
): Promise<DiscoveredAgent[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const query = encodeURIComponent(CATEGORY_SEARCH_QUERIES[category]);
  const result = await scanFetch<ScanAgent[]>(
    `/agents/search?q=${query}&chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}`,
  );
  const checkedAt = new Date().toISOString();

  // Search ranking alone is not sufficient evidence for a category. Only keep
  // records whose indexed name/description/tags independently contain category evidence.
  return result.data
    .map((agent) => normalizeAgent(agent, checkedAt))
    .filter((agent) => agent.categories.includes(category));
}

export async function discoverAcrossRequiredCategories(limitPerCategory = 5): Promise<{
  agents: DiscoveredAgent[];
  checkedAt: string;
  categoryCounts: Record<MarketplaceCategory, number>;
}> {
  const categories = Object.keys(CATEGORY_SEARCH_QUERIES) as MarketplaceCategory[];
  const settled = await Promise.allSettled(
    categories.map(async (category) => ({ category, agents: await searchBscAgents(category, limitPerCategory) })),
  );

  const unique = new Map<string, DiscoveredAgent>();
  const categoryCounts = Object.fromEntries(categories.map((category) => [category, 0])) as Record<MarketplaceCategory, number>;

  settled.forEach((result) => {
    if (result.status !== "fulfilled") return;
    categoryCounts[result.value.category] = result.value.agents.length;
    result.value.agents.forEach((agent) => unique.set(`${agent.chainId}:${agent.tokenId}`, agent));
  });

  return {
    agents: [...unique.values()],
    checkedAt: new Date().toISOString(),
    categoryCounts,
  };
}
