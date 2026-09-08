import { createPublicClient, formatEther, formatUnits, http, isAddress, keccak256, toHex, type Address } from "viem";
import { bscMainnet } from "@/lib/bsc";
import type { AuditionTask } from "@/lib/auditions/types";
import type { IndependentCheckItem, IndependentVerification } from "@/lib/auditions/verification-types";

const PANCAKE_V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865" as Address;
const VENUS_CORE_COMPTROLLER = "0xfD36E2c2a6789Db23113685031d7F16329158384" as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const TOKENS: Record<string, Address> = {
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

function now() {
  return new Date().toISOString();
}

function item(args: Omit<IndependentCheckItem, "observedAt">): IndependentCheckItem {
  return { ...args, observedAt: now() };
}

function pairFromText(value: string): [string, string] | null {
  const symbols = value.toUpperCase().match(/[A-Z0-9]{2,12}/g) ?? [];
  const known = symbols.filter((symbol) => Boolean(TOKENS[symbol]));
  return known.length >= 2 ? [known[0], known[1]] : null;
}

async function tokenMetadata(rpc: ReturnType<typeof client>, address: Address) {
  const [symbol, decimals] = await Promise.all([
    rpc.readContract({ address, abi: erc20MetadataAbi, functionName: "symbol" }),
    rpc.readContract({ address, abi: erc20MetadataAbi, functionName: "decimals" }),
  ]);
  return { symbol, decimals };
}

async function findPancakePool(rpc: ReturnType<typeof client>, tokenA: Address, tokenB: Address) {
  for (const fee of [100, 500, 2500, 10000] as const) {
    const pool = await rpc.readContract({
      address: PANCAKE_V3_FACTORY,
      abi: factoryAbi,
      functionName: "getPool",
      args: [tokenA, tokenB, fee],
    });
    if (pool.toLowerCase() !== ZERO_ADDRESS) return { pool, fee };
  }
  return null;
}

async function pancakeContext(rpc: ReturnType<typeof client>, symbols: [string, string]): Promise<IndependentCheckItem> {
  const tokenA = TOKENS[symbols[0]];
  const tokenB = TOKENS[symbols[1]];
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

  const [slot0, liquidity, token0, token1, meta0, meta1] = await Promise.all([
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "slot0" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "liquidity" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "token0" }),
    rpc.readContract({ address: found.pool, abi: poolAbi, functionName: "token1" }),
    tokenMetadata(rpc, tokenA),
    tokenMetadata(rpc, tokenB),
  ]);

  const token0Meta = token0.toLowerCase() === tokenA.toLowerCase() ? meta0 : meta1;
  const token1Meta = token1.toLowerCase() === tokenB.toLowerCase() ? meta1 : meta0;
  const sqrt = Number(slot0[0]) / 2 ** 96;
  const token1PerToken0 = sqrt * sqrt * 10 ** (token0Meta.decimals - token1Meta.decimals);
  const requestedIsToken0 = token0.toLowerCase() === tokenA.toLowerCase();
  const requestedPrice = requestedIsToken0 ? token1PerToken0 : (token1PerToken0 === 0 ? 0 : 1 / token1PerToken0);

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
      tick: slot0[1],
      sqrtPriceX96: slot0[0].toString(),
      liquidity: liquidity.toString(),
      token0,
      token1,
      requestedPrice: Number.isFinite(requestedPrice) ? requestedPrice : null,
    },
  });
}

async function healthChecks(rpc: ReturnType<typeof client>, task: Extract<AuditionTask, { category: "Health Factor Monitoring" }>) {
  const checks: IndependentCheckItem[] = [];
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
    summary: `Wallet exists as a queryable BNB account with ${formatEther(balance)} BNB native balance at the checked block.`,
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
      const risky = shortfall > BigInt(0);
      checks.push(item({
        id: "venus-account-liquidity",
        label: "Venus liquidation context",
        status: "verified",
        summary: risky
          ? `Venus Core reports a non-zero account shortfall (${formatUnits(shortfall, 18)} reference units). This is direct liquidation-risk context.`
          : `Venus Core reports zero account shortfall and ${formatUnits(liquidity, 18)} reference units of excess liquidity.`,
        source: `Venus Core Comptroller ${VENUS_CORE_COMPTROLLER}`,
        raw: { errorCode: errorCode.toString(), liquidity: liquidity.toString(), shortfall: shortfall.toString() },
      }));
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
      summary: "Only the Venus Core health context has a bounded on-chain verifier in this build; another protocol was requested.",
      source: "AgentDesk verifier scope",
    }));
  }
  return checks;
}

async function yieldChecks(rpc: ReturnType<typeof client>, task: Extract<AuditionTask, { category: "Yield Optimisation" }>) {
  const symbol = task.asset.toUpperCase().trim();
  const address = TOKENS[symbol];
  const checks: IndependentCheckItem[] = [];
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

  if (symbol !== "WBNB" && symbol !== "BNB") checks.push(await pancakeContext(rpc, [symbol, "WBNB"]));
  checks.push(item({
    id: "yield-economic-claim",
    label: "Yield/APY claim",
    status: "not-verifiable",
    summary: "A free-text audition response is not treated as a verified APY. Protocol-specific position/rate fields must be machine-readable before AgentDesk will grade the economic claim.",
    source: "AgentDesk evidence boundary",
  }));
  return checks;
}

async function gridChecks(rpc: ReturnType<typeof client>, task: Extract<AuditionTask, { category: "Grid Trading" }>) {
  const pair = pairFromText(task.pair);
  if (!pair) {
    return [item({
      id: "grid-market",
      label: "Grid market state",
      status: "not-verifiable",
      summary: `Could not map ${task.pair} to two canonical BNB token contracts without guessing.`,
      source: "AgentDesk canonical token map",
    })];
  }
  const checks = [await pancakeContext(rpc, pair)];
  checks.push(item({
    id: "grid-parameters",
    label: "Grid parameter claim",
    status: "not-verifiable",
    summary: "The live market context is verified separately. Agent-proposed grid bounds remain ungraded unless the response exposes machine-readable bounds/spacing that can be compared deterministically.",
    source: "AgentDesk evidence boundary",
  }));
  return checks;
}

async function rebalanceChecks(rpc: ReturnType<typeof client>, task: Extract<AuditionTask, { category: "Rebalancing" }>) {
  const checks: IndependentCheckItem[] = [];
  const addressMatch = `${task.portfolio} ${task.objective}`.match(/0x[a-fA-F0-9]{40}/)?.[0];
  if (addressMatch && isAddress(addressMatch)) {
    const balance = await rpc.getBalance({ address: addressMatch });
    checks.push(item({
      id: "rebalance-wallet",
      label: "Portfolio wallet state",
      status: "verified",
      summary: `Portfolio text contains ${addressMatch}; its live native balance is ${formatEther(balance)} BNB.`,
      source: "BNB Chain RPC",
      raw: { wallet: addressMatch, nativeBalanceWei: balance.toString() },
    }));
  } else {
    checks.push(item({
      id: "rebalance-wallet",
      label: "Portfolio wallet state",
      status: "not-verifiable",
      summary: "No wallet address was supplied in the portfolio description, so holdings cannot be independently reconstructed from chain state.",
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
  return checks;
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

    if (task.category === "Health Factor Monitoring") checks = await healthChecks(rpc, task);
    else if (task.category === "Yield Optimisation") checks = await yieldChecks(rpc, task);
    else if (task.category === "Grid Trading") checks = await gridChecks(rpc, task);
    else checks = await rebalanceChecks(rpc, task);
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
    boundary: "Independent checks verify only facts AgentDesk can reproduce from BNB state. A verified market/account context is not the same as proving that an agent's strategy, APY, execution quality or future outcome is correct.",
  };
}
