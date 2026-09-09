import {
  createPublicClient,
  formatEther,
  formatUnits,
  http,
  isAddress,
  keccak256,
  toHex,
  type Address,
} from "viem";
import { bscMainnet } from "@/lib/bsc";
import type { AuditionTask } from "@/lib/auditions/types";
import { parseStructuredAuditionClaims } from "@/lib/auditions/structured-output";
import type {
  CategoryDepthSummary,
  IndependentCheckItem,
  IndependentVerification,
} from "@/lib/auditions/verification-types";

const PANCAKE_V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865" as Address;
const VENUS_CORE_COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384" as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const BNB_CANONICAL_TOKENS: Record<string, Address> = {
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
};

const factoryAbi = [{
  type: "function",
  name: "getPool",
  stateMutability: "view",
  inputs: [
    { name: "tokenA", type: "address" },
    { name: "tokenB", type: "address" },
    { name: "fee", type: "uint24" },
  ],
  outputs: [{ name: "", type: "address" }],
}] as const;

const poolAbi = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint32" },
      { name: "unlocked", type: "bool" },
    ],
  },
  { type: "function", name: "liquidity", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint128" }] },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
] as const;

const erc20MetadataAbi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

const venusComptrollerAbi = [{
  type: "function",
  name: "getAccountLiquidity",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [
    { name: "error", type: "uint256" },
    { name: "liquidity", type: "uint256" },
    { name: "shortfall", type: "uint256" },
  ],
}] as const;

function client() {
  return createPublicClient({
    chain: bscMainnet,
    transport: http(process.env.BSC_MAINNET_RPC_URL?.trim() || bscMainnet.rpcUrls.default.http[0], { timeout: 8_000 }),
  });
}

type RpcClient = ReturnType<typeof client>;

function now() {
  return new Date().toISOString();
}

function item(args: Omit<IndependentCheckItem, "observedAt">): IndependentCheckItem {
  return { ...args, observedAt: now() };
}

function pairFromText(value: string): [string, string] | null {
  const symbols = value.toUpperCase().match(/[A-Z0-9]{2,12}/g) ?? [];
  const known = symbols.filter((symbol) => Boolean(BNB_CANONICAL_TOKENS[symbol]));
  return known.length >= 2 ? [known[0], known[1]] : null;
}

function rawRecord(check: IndependentCheckItem | undefined): Record<string, unknown> | null {
  return check?.raw && typeof check.raw === "object" && !Array.isArray(check.raw)
    ? check.raw as Record<string, unknown>
    : null;
}

function scenarioAllocations(value: string): Record<string, number> {
  const allocations: Record<string, number> = {};
  const regex = /\b([A-Za-z0-9]{2,12})\b\s*(?:[:=\-]\s*)?(\d+(?:\.\d+)?)\s*%/g;
  for (const match of value.matchAll(regex)) {
    const asset = match[1]?.toUpperCase();
    const weight = Number(match[2]);
    if (asset && Number.isFinite(weight)) allocations[asset] = weight;
  }
  return allocations;
}

async function tokenMetadata(rpc: RpcClient, address: Address) {
  const [symbol, decimals] = await Promise.all([
    rpc.readContract({ address, abi: erc20MetadataAbi, functionName: "symbol" }),
    rpc.readContract({ address, abi: erc20MetadataAbi, functionName: "decimals" }),
  ]);
  return { symbol, decimals: Number(decimals) };
}

async function findPancakePool(rpc: RpcClient, tokenA: Address, tokenB: Address) {
  for (const fee of [100, 500, 2500, 10000] as const) {
    const pool = await rpc.readContract({
      address: PANCAKE_V3_FACTORY,
      abi: factoryAbi,
      functionName: "getPool",
      args: [tokenA, tokenB, fee],
    });
    if (pool.toLowerCase() !== ZERO_ADDRESS) return { pool: pool as Address, fee };
  }
  return null;
}

async function pancakeContext(rpc: RpcClient, symbols: [string, string]): Promise<IndependentCheckItem> {
  const tokenA = BNB_CANONICAL_TOKENS[symbols[0]];
  const tokenB = BNB_CANONICAL_TOKENS[symbols[1]];
  if (!tokenA || !tokenB) {
    return item({
      id: "pancake-v3-pair",
      label: "PancakeSwap V3 market context",
      status: "not-verifiable",
      summary: `AgentDesk does not have canonical token addresses for ${symbols.join("/")}.`,
      source: "BNB Chain",
    });
  }

  const found = await findPancakePool(rpc, tokenA, tokenB);
  if (!found) {
    return item({
      id: "pancake-v3-pair",
      label: "PancakeSwap V3 market context",
      status: "not-verifiable",
      summary: `No PancakeSwap V3 pool was found for ${symbols.join("/")} across the checked canonical fee tiers.`,
      source: `PancakeV3Factory ${PANCAKE_V3_FACTORY}`,
    });
  }

  const [slot0, liquidity, token0, token1, metaA, metaB] = await Promise.all([
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "slot0" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "liquidity" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "token0" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "token1" }),
    tokenMetadata(rpc, tokenA),
    tokenMetadata(rpc, tokenB),
  ]);

  const token0Meta = token0.toLowerCase() === tokenA.toLowerCase() ? metaA : metaB;
  const token1Meta = token1.toLowerCase() === tokenB.toLowerCase() ? metaB : metaA;
  const sqrt = Number(slot0[0]) / 2 ** 96;
  const token1PerToken0 = sqrt * sqrt * 10 ** (token0Meta.decimals - token1Meta.decimals);
  const requestedIsToken0 = token0.toLowerCase() === tokenA.toLowerCase();
  const requestedPrice = requestedIsToken0
    ? token1PerToken0
    : token1PerToken0 === 0 ? 0 : 1 / token1PerToken0;

  return item({
    id: "pancake-v3-pair",
    label: "PancakeSwap V3 market context",
    status: "verified",
    summary: `${symbols[0]}/${symbols[1]} has a live V3 pool at fee ${found.fee}; current pool price is approximately ${Number.isFinite(requestedPrice) ? requestedPrice.toPrecision(8) : "unavailable"} ${symbols[1]} per ${symbols[0]}.`,
    source: `PancakeSwap V3 pool ${found.pool}`,
    raw: {
      factory: PANCAKE_V3_FACTORY,
      pool: found.pool,
      fee: found.fee,
      tick: Number(slot0[1]),
      sqrtPriceX96: slot0[0].toString(),
      liquidity: liquidity.toString(),
      token0,
      token1,
      requestedPair: symbols.join("/"),
      requestedPrice: Number.isFinite(requestedPrice) ? requestedPrice : null,
    },
  });
}

function structuredCheck(detected: boolean, raw: unknown): IndependentCheckItem {
  return item({
    id: "machine-readable-claims",
    label: "Machine-readable agent claims",
    status: detected ? "verified" : "not-verifiable",
    summary: detected
      ? "The audition included parseable machine-readable claims, so AgentDesk can deterministically test supported fields instead of relying only on prose."
      : "The audition returned prose only. AgentDesk preserves the answer but will not infer precise numerical claims that the agent did not expose in machine-readable form.",
    source: "AgentDesk audition output parser",
    raw: detected ? raw : undefined,
  });
}

async function healthChecks(
  rpc: RpcClient,
  task: Extract<AuditionTask, { category: "Health Factor Monitoring" }>,
  output: string,
) {
  const claims = parseStructuredAuditionClaims(output, task.category);
  const checks: IndependentCheckItem[] = [structuredCheck(claims.detected, claims.raw)];
  if (!isAddress(task.wallet)) {
    checks.push(item({
      id: "health-wallet",
      label: "Wallet state",
      status: "not-verifiable",
      summary: "The task wallet is not a valid EVM address, so no BNB account state can be checked.",
      source: "BNB Chain",
    }));
    return checks;
  }

  const balance = await rpc.getBalance({ address: task.wallet });
  checks.push(item({
    id: "health-wallet",
    label: "Wallet state",
    status: "verified",
    summary: `Wallet is queryable on BNB Chain with ${formatEther(balance)} BNB native balance at the checked block. This balance is context, not a lending-health score.`,
    source: "BNB Chain RPC",
    raw: { wallet: task.wallet, nativeBalanceWei: balance.toString() },
  }));

  if ((task.protocol ?? "").toLowerCase().includes("venus")) {
    try {
      const [errorCode, liquidity, shortfall] = await rpc.readContract({
        address: VENUS_CORE_COMPTROLLER,
        abi: venusComptrollerAbi,
        functionName: "getAccountLiquidity",
        args: [task.wallet],
      });
      const hasShortfall = shortfall > BigInt(0);
      checks.push(item({
        id: "venus-account-liquidity",
        label: "Venus liquidation context",
        status: "verified",
        summary: hasShortfall
          ? `Venus Core reports a non-zero account shortfall (${formatUnits(shortfall, 18)} reference units). This is direct liquidation-risk context.`
          : `Venus Core reports zero account shortfall and ${formatUnits(liquidity, 18)} reference units of excess liquidity.`,
        source: `Venus Core Comptroller ${VENUS_CORE_COMPTROLLER}`,
        raw: { errorCode: errorCode.toString(), liquidity: liquidity.toString(), shortfall: shortfall.toString() },
      }));

      const claim = claims.health;
      if (claim?.shortfall !== null && claim?.shortfall !== undefined) {
        const claimedHasShortfall = claim.shortfall > 0;
        checks.push(item({
          id: "health-shortfall-claim",
          label: "Agent shortfall direction",
          status: claimedHasShortfall === hasShortfall ? "verified" : "conflict",
          summary: claimedHasShortfall === hasShortfall
            ? `The agent's machine-readable shortfall direction agrees with the current Venus Core read (${hasShortfall ? "non-zero" : "zero"}).`
            : `The agent's machine-readable shortfall direction conflicts with the current Venus Core read (${hasShortfall ? "non-zero" : "zero"}).`,
          source: `Venus Core Comptroller ${VENUS_CORE_COMPTROLLER}`,
          raw: { claimedShortfall: claim.shortfall, onChainShortfall: shortfall.toString() },
        }));
      }

      if (claim?.healthFactor !== null && claim?.healthFactor !== undefined) {
        checks.push(item({
          id: "health-factor-claim",
          label: "Agent health-factor number",
          status: "not-verifiable",
          summary: `The agent exposed health factor ${claim.healthFactor}, but this bounded verifier does not reconstruct a protocol health factor from every Venus market, oracle price and collateral rule. The number remains ungraded.`,
          source: "AgentDesk evidence boundary",
        }));
      }
    } catch (error) {
      checks.push(item({
        id: "venus-account-liquidity",
        label: "Venus liquidation context",
        status: "error",
        summary: error instanceof Error ? error.message : "Venus account-liquidity read failed.",
        source: `Venus Core Comptroller ${VENUS_CORE_COMPTROLLER}`,
      }));
    }
  } else {
    checks.push(item({
      id: "health-protocol",
      label: "Protocol risk state",
      status: "not-verifiable",
      summary: "Only Venus Core has a bounded health verifier in this build. AgentDesk will not pretend another lending protocol was checked.",
      source: "AgentDesk verifier scope",
    }));
  }
  return checks;
}

async function yieldChecks(
  rpc: RpcClient,
  task: Extract<AuditionTask, { category: "Yield Optimisation" }>,
  output: string,
) {
  const claims = parseStructuredAuditionClaims(output, task.category);
  const symbol = task.asset.toUpperCase().trim();
  const address = BNB_CANONICAL_TOKENS[symbol];
  const checks: IndependentCheckItem[] = [structuredCheck(claims.detected, claims.raw)];
  if (!address) {
    checks.push(item({
      id: "yield-asset",
      label: "Yield asset identity",
      status: "not-verifiable",
      summary: `No canonical BNB token address is configured for ${symbol}; AgentDesk will not guess one from the symbol.`,
      source: "AgentDesk canonical token map",
    }));
    return checks;
  }

  const metadata = await tokenMetadata(rpc, address);
  checks.push(item({
    id: "yield-asset",
    label: "Yield asset identity",
    status: "verified",
    summary: `${symbol} resolves on-chain to ${address} with symbol ${metadata.symbol} and ${metadata.decimals} decimals.`,
    source: `BNB Chain token ${address}`,
    raw: { address, symbol: metadata.symbol, decimals: metadata.decimals },
  }));

  let marketCheck: IndependentCheckItem | null = null;
  const claimPair = claims.yield?.pair ? pairFromText(claims.yield.pair) : null;
  const requestedPair: [string, string] | null = claimPair
    ?? (symbol !== "WBNB" && symbol !== "BNB" ? [symbol, "WBNB"] : null);
  if (requestedPair) {
    marketCheck = await pancakeContext(rpc, requestedPair);
    checks.push(marketCheck);
  }

  const claimedPool = claims.yield?.poolAddress;
  if (claimedPool) {
    const livePool = rawRecord(marketCheck)?.pool;
    if (!isAddress(claimedPool)) {
      checks.push(item({
        id: "yield-pool-claim",
        label: "Claimed pool address",
        status: "conflict",
        summary: "The machine-readable pool address is not a valid EVM address.",
        source: "AgentDesk deterministic claim check",
      }));
    } else if (typeof livePool === "string" && isAddress(livePool)) {
      const matches = livePool.toLowerCase() === claimedPool.toLowerCase();
      checks.push(item({
        id: "yield-pool-claim",
        label: "Claimed pool address",
        status: matches ? "verified" : "conflict",
        summary: matches
          ? "The agent's machine-readable pool address matches the live PancakeSwap V3 pool AgentDesk independently resolved."
          : `The agent claimed pool ${claimedPool}, while the checked live pair resolved to ${livePool}.`,
        source: `PancakeV3Factory ${PANCAKE_V3_FACTORY}`,
      }));
    }
  }

  if (claims.yield?.estimatedApyPct !== null && claims.yield?.estimatedApyPct !== undefined) {
    checks.push(item({
      id: "yield-economic-claim",
      label: "Yield/APY claim",
      status: "not-verifiable",
      summary: `The agent exposed an estimated APY of ${claims.yield.estimatedApyPct}%. Pool existence and market context can be checked, but this build does not reproduce protocol reward/rate accounting, so the APY remains unverified.`,
      source: "AgentDesk evidence boundary",
    }));
  } else {
    checks.push(item({
      id: "yield-economic-claim",
      label: "Yield/APY claim",
      status: "not-verifiable",
      summary: "No independently reproducible APY was supplied. AgentDesk will not turn a free-text yield claim into a verified rate.",
      source: "AgentDesk evidence boundary",
    }));
  }
  return checks;
}

async function gridChecks(
  rpc: RpcClient,
  task: Extract<AuditionTask, { category: "Grid Trading" }>,
  output: string,
) {
  const claims = parseStructuredAuditionClaims(output, task.category);
  const checks: IndependentCheckItem[] = [structuredCheck(claims.detected, claims.raw)];
  const pair = pairFromText(claims.grid?.pair ?? task.pair);
  if (!pair) {
    checks.push(item({
      id: "grid-market",
      label: "Grid market state",
      status: "not-verifiable",
      summary: `Could not map ${task.pair} to two canonical BNB token contracts without guessing.`,
      source: "AgentDesk canonical token map",
    }));
    return checks;
  }

  const market = await pancakeContext(rpc, pair);
  checks.push(market);
  const grid = claims.grid;
  const lower = grid?.lowerPrice;
  const upper = grid?.upperPrice;
  const count = grid?.gridCount;

  if (lower !== null && lower !== undefined && upper !== null && upper !== undefined && count !== null && count !== undefined) {
    const structurallyValid = lower > 0 && upper > lower && Number.isInteger(count) && count >= 2 && count <= 500;
    const livePrice = rawRecord(market)?.requestedPrice;
    const current = typeof livePrice === "number" && Number.isFinite(livePrice) ? livePrice : null;
    const priceInside = current === null ? null : current >= lower && current <= upper;
    const status = !structurallyValid || priceInside === false ? "conflict" : "verified";
    checks.push(item({
      id: "grid-parameters",
      label: "Grid parameter coherence",
      status,
      summary: !structurallyValid
        ? `Proposed grid parameters are internally invalid: lower=${lower}, upper=${upper}, grids=${count}.`
        : priceInside === false
          ? `The grid is structurally valid, but the live checked pool price (${current?.toPrecision(8)}) is outside the proposed ${lower}–${upper} range.`
          : current === null
            ? `The grid is structurally valid (${lower}–${upper}, ${count} levels), but current price could not be reproduced for a live range check.`
            : `The grid is structurally valid (${lower}–${upper}, ${count} levels) and the live checked price (${current.toPrecision(8)}) lies inside the proposed range.`,
      source: current === null ? "AgentDesk deterministic claim check" : market.source,
      raw: { lowerPrice: lower, upperPrice: upper, gridCount: count, currentPrice: current },
    }));

    const liveFee = rawRecord(market)?.fee;
    if (grid?.feeTier !== null && grid?.feeTier !== undefined && typeof liveFee === "number") {
      checks.push(item({
        id: "grid-fee-tier",
        label: "Grid fee tier",
        status: grid.feeTier === liveFee ? "verified" : "conflict",
        summary: grid.feeTier === liveFee
          ? `The agent's fee tier ${grid.feeTier} matches the independently resolved PancakeSwap V3 pool.`
          : `The agent proposed fee tier ${grid.feeTier}, while the independently resolved live pool uses ${liveFee}.`,
        source: market.source,
      }));
    }
  } else {
    checks.push(item({
      id: "grid-parameters",
      label: "Grid parameter coherence",
      status: "not-verifiable",
      summary: "The agent did not expose lower price, upper price and grid count together in machine-readable form, so AgentDesk will not infer them from prose.",
      source: "AgentDesk evidence boundary",
    }));
  }
  return checks;
}

async function rebalanceChecks(
  rpc: RpcClient,
  task: Extract<AuditionTask, { category: "Rebalancing" }>,
  output: string,
) {
  const claims = parseStructuredAuditionClaims(output, task.category);
  const checks: IndependentCheckItem[] = [structuredCheck(claims.detected, claims.raw)];
  const addressMatch = `${task.portfolio} ${task.objective}`.match(/0x[a-fA-F0-9]{40}/)?.[0];
  if (addressMatch && isAddress(addressMatch)) {
    const balance = await rpc.getBalance({ address: addressMatch });
    checks.push(item({
      id: "rebalance-wallet",
      label: "Portfolio wallet state",
      status: "verified",
      summary: `Portfolio text contains ${addressMatch}; its live native balance is ${formatEther(balance)} BNB. This verifies only the native balance, not every token/LP holding.`,
      source: "BNB Chain RPC",
      raw: { wallet: addressMatch, nativeBalanceWei: balance.toString() },
    }));
  } else {
    checks.push(item({
      id: "rebalance-wallet",
      label: "Portfolio wallet state",
      status: "not-verifiable",
      summary: "No wallet address was supplied, so this is treated as a portfolio scenario rather than a claim about actual holdings.",
      source: "AgentDesk evidence boundary",
    }));
  }

  const pair = pairFromText(task.portfolio);
  if (pair) checks.push(await pancakeContext(rpc, pair));
  else checks.push(item({
    id: "rebalance-market",
    label: "Rebalancing market context",
    status: "not-verifiable",
    summary: "No supported token pair was found in the portfolio description, so AgentDesk will not assume a venue or pool.",
    source: "AgentDesk evidence boundary",
  }));

  const allocations = claims.rebalance?.targetAllocations ?? {};
  const entries = Object.entries(allocations);
  if (entries.length) {
    const sum = entries.reduce((total, [, weight]) => total + weight, 0);
    const rangesValid = entries.every(([, weight]) => Number.isFinite(weight) && weight >= 0 && weight <= 100);
    const sumValid = Math.abs(sum - 100) <= 0.5;
    checks.push(item({
      id: "rebalance-allocation-math",
      label: "Target allocation math",
      status: rangesValid && sumValid ? "verified" : "conflict",
      summary: rangesValid && sumValid
        ? `Machine-readable target weights total ${sum.toFixed(2)}% and every weight is within 0–100%.`
        : `Target allocation is internally inconsistent: total=${sum.toFixed(2)}% and/or at least one weight is outside 0–100%.`,
      source: "AgentDesk deterministic allocation check",
      raw: { allocations, totalPct: sum },
    }));

    const unknown = entries.map(([asset]) => asset).filter((asset) => !BNB_CANONICAL_TOKENS[asset]);
    checks.push(item({
      id: "rebalance-asset-identities",
      label: "Target asset identities",
      status: unknown.length ? "not-verifiable" : "verified",
      summary: unknown.length
        ? `Canonical BNB token addresses are not configured for: ${unknown.join(", ")}. AgentDesk will not guess their contracts.`
        : `Every target asset is present in AgentDesk's canonical BNB token map: ${entries.map(([asset]) => asset).join(", ")}.`,
      source: "AgentDesk canonical token map",
    }));

    const current = scenarioAllocations(task.portfolio);
    const currentEntries = Object.entries(current);
    if (currentEntries.length) {
      const assets = new Set([...Object.keys(current), ...Object.keys(allocations)]);
      let absoluteMovement = 0;
      for (const asset of assets) absoluteMovement += Math.abs((allocations[asset] ?? 0) - (current[asset] ?? 0));
      const oneWayTurnover = absoluteMovement / 2;
      checks.push(item({
        id: "rebalance-turnover",
        label: "Scenario turnover",
        status: "verified",
        summary: `Against the percentages explicitly supplied in the scenario, the proposed target implies approximately ${oneWayTurnover.toFixed(2)} percentage points of one-way allocation turnover.`,
        source: "AgentDesk deterministic portfolio math",
        raw: { current, target: allocations, oneWayTurnoverPct: oneWayTurnover },
      }));
    }
  } else {
    checks.push(item({
      id: "rebalance-allocation-math",
      label: "Target allocation math",
      status: "not-verifiable",
      summary: "The agent did not expose target weights in machine-readable form, so allocation totals and turnover cannot be checked deterministically.",
      source: "AgentDesk evidence boundary",
    }));
  }
  return checks;
}

function depthSummary(task: AuditionTask, checks: IndependentCheckItem[]): CategoryDepthSummary {
  const verifiedCount = checks.filter((check) => check.status === "verified").length;
  const conflictCount = checks.filter((check) => check.status === "conflict").length;
  const unresolvedCount = checks.filter((check) => check.status === "not-verifiable").length;
  const errorCount = checks.filter((check) => check.status === "error").length;
  const machineReadableClaims = checks.find((check) => check.id === "machine-readable-claims")?.status === "verified";
  const verdict = conflictCount
    ? "CONFLICT WITH LIVE CONTEXT"
    : errorCount && verifiedCount === 0
      ? "CHECK FAILED"
      : verifiedCount && unresolvedCount === 0 && errorCount === 0
        ? "SUPPORTED BY LIVE CONTEXT"
        : verifiedCount
          ? "MIXED EVIDENCE"
          : "NOT ENOUGH EVIDENCE";

  const metadata: Record<AuditionTask["category"], { title: string; scenarioLabel: string }> = {
    "Health Factor Monitoring": {
      title: "Health risk evidence",
      scenarioLabel: "Read-only wallet and Venus risk context — no approvals or transactions",
    },
    "Yield Optimisation": {
      title: "Yield route evidence",
      scenarioLabel: "Scenario capital only — pool context can be checked without depositing funds",
    },
    "Grid Trading": {
      title: "Grid strategy evidence",
      scenarioLabel: "Scenario capital only — live market/range checks without placing orders",
    },
    Rebalancing: {
      title: "Rebalancing evidence",
      scenarioLabel: "Read-only portfolio/scenario math — no rebalance is executed",
    },
  };

  return {
    verdict,
    title: metadata[task.category].title,
    scenarioLabel: metadata[task.category].scenarioLabel,
    verifiedCount,
    conflictCount,
    unresolvedCount,
    errorCount,
    machineReadableClaims,
    highlights: checks
      .filter((check) => check.status === "verified" || check.status === "conflict")
      .slice(0, 4)
      .map((check) => check.summary),
  };
}

export async function verifyAgainstBnbState(task: AuditionTask, output: string): Promise<IndependentVerification> {
  const rpc = client();
  const checkedAt = now();
  const outputHash = keccak256(toHex(output));
  let blockNumber: string | null = null;
  let blockTimestamp: string | null = null;
  let checks: IndependentCheckItem[] = [];

  try {
    const block = await rpc.getBlock({ blockTag: "latest" });
    blockNumber = block.number?.toString() ?? null;
    blockTimestamp = new Date(Number(block.timestamp) * 1000).toISOString();

    if (task.category === "Health Factor Monitoring") checks = await healthChecks(rpc, task, output);
    else if (task.category === "Yield Optimisation") checks = await yieldChecks(rpc, task, output);
    else if (task.category === "Grid Trading") checks = await gridChecks(rpc, task, output);
    else checks = await rebalanceChecks(rpc, task, output);
  } catch (error) {
    checks.push(item({
      id: "bnb-verifier-runtime",
      label: "BNB state verifier",
      status: "error",
      summary: error instanceof Error ? error.message : "BNB state verification failed.",
      source: "BNB Chain RPC",
    }));
  }

  const status = checks.some((check) => check.status === "conflict")
    ? "CONFLICT"
    : checks.some((check) => check.status === "verified")
      ? "VERIFIED CONTEXT"
      : checks.some((check) => check.status === "error")
        ? "ERROR"
        : "NOT VERIFIABLE";

  return {
    status,
    category: task.category,
    checkedAt,
    blockNumber,
    blockTimestamp,
    outputHash,
    checks,
    depth: depthSummary(task, checks),
    boundary: "Independent checks verify only facts AgentDesk can reproduce from BNB state or deterministic scenario math. Verified context is not proof that an agent's strategy, APY, execution quality or future outcome is correct.",
  };
}
