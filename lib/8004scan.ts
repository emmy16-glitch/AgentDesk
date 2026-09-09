const CURRENT_SCAN_BASE_URL = "https://api.8004scan.io/api/v1";
const LEGACY_SCAN_BASE_URL = "https://8004scan.io/api/v1/public";
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

interface ScanFetchResult<T> {
  body: ScanResponse<T>;
  apiBase: string;
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
  sourceApi: string;
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

async function requestScan<T>(baseUrl: string, path: string): Promise<{ response: Response; body: ScanResponse<T> }> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: headers(),
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });

  let body: ScanResponse<T>;
  try {
    body = (await response.json()) as ScanResponse<T>;
  } catch {
    throw new Error(`8004scan returned a non-JSON response from ${baseUrl}`);
  }

  return { response, body };
}

async function scanFetch<T>(currentPath: string, legacyPath = currentPath): Promise<ScanFetchResult<T>> {
  try {
    const current = await requestScan<T>(CURRENT_SCAN_BASE_URL, currentPath);
    if (current.response.ok && current.body.success) {
      return { body: current.body, apiBase: CURRENT_SCAN_BASE_URL };
    }

    if (![404, 405, 410, 502, 503, 504].includes(current.response.status)) {
      const message = current.body.error?.message || `8004scan request failed with HTTP ${current.response.status}`;
      throw new Error(message);
    }
  } catch (error) {
    // Network/DNS/migration failures on the new host may occur while 8004scan
    // transitions clients. We attempt the documented legacy public endpoint once.
    if (error instanceof Error && /rate limit|HTTP 429/i.test(error.message)) throw error;
  }

  const legacy = await requestScan<T>(LEGACY_SCAN_BASE_URL, legacyPath);
  if (!legacy.response.ok || !legacy.body.success) {
    const message = legacy.body.error?.message || `8004scan legacy request failed with HTTP ${legacy.response.status}`;
    throw new Error(message);
  }
  return { body: legacy.body, apiBase: LEGACY_SCAN_BASE_URL };
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

export function normalizeAgent(agent: ScanAgent, checkedAt: string, sourceApi: string): DiscoveredAgent {
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
    sourceApi,
    sourceCheckedAt: checkedAt,
    category: classification.category,
    categories: classification.categories,
    categoryEvidence: classification.evidence,
    operationalStatus: "registry-listed",
  };
}

export async function listBscAgents(limit = 20): Promise<{
  agents: DiscoveredAgent[];
  checkedAt: string;
  upstreamTimestamp: string | null;
  total: number | null;
  sourceApi: string;
}> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const result = await scanFetch<ScanAgent[]>(
    `/agents?chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}&sortBy=total_score&sortOrder=desc&isTestnet=false`,
  );
  const checkedAt = new Date().toISOString();

  return {
    agents: result.body.data.map((agent) => normalizeAgent(agent, checkedAt, result.apiBase)),
    checkedAt,
    upstreamTimestamp: result.body.meta?.timestamp ?? null,
    total: result.body.meta?.pagination?.total ?? null,
    sourceApi: result.apiBase,
  };
}

export async function searchBscAgents(
  category: MarketplaceCategory,
  limit = 10,
): Promise<DiscoveredAgent[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const query = encodeURIComponent(CATEGORY_SEARCH_QUERIES[category]);
  const result = await scanFetch<ScanAgent[]>(
    `/agents/search/semantic?q=${query}&chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}`,
    `/agents/search?q=${query}&chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}`,
  );
  const checkedAt = new Date().toISOString();

  return result.body.data
    .map((agent) => normalizeAgent(agent, checkedAt, result.apiBase))
    .filter((agent) => agent.categories.includes(category));
}

/**
 * Searches indexed ERC-8004 metadata for one task-aware query. The returned
 * records are registry-listed only; identity and endpoint qualification remain
 * separate phases in the discovery pipeline.
 */
export async function searchBscAgentsByQuery(queryText: string, limit = 16): Promise<{
  agents: DiscoveredAgent[];
  sourceApi: string;
}> {
  const query = queryText.trim();
  if (!query) return { agents: [], sourceApi: CURRENT_SCAN_BASE_URL };
  const safeLimit = Math.min(Math.max(limit, 1), 30);
  const encoded = encodeURIComponent(query);
  const result = await scanFetch<ScanAgent[]>(
    `/agents/search/semantic?q=${encoded}&chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}`,
    `/agents/search?q=${encoded}&chainId=${BSC_MAINNET_CHAIN_ID}&limit=${safeLimit}`,
  );
  const checkedAt = new Date().toISOString();
  return {
    agents: result.body.data.map((agent) => normalizeAgent(agent, checkedAt, result.apiBase)),
    sourceApi: result.apiBase,
  };
}

export async function discoverAcrossRequiredCategories(limitPerCategory = 5): Promise<{
  agents: DiscoveredAgent[];
  checkedAt: string;
  categoryCounts: Record<MarketplaceCategory, number>;
  sourceApis: string[];
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

  const agents = [...unique.values()];
  return {
    agents,
    checkedAt: new Date().toISOString(),
    categoryCounts,
    sourceApis: [...new Set(agents.map((agent) => agent.sourceApi))],
  };
}
