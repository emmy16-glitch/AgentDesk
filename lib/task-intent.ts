import type { MarketplaceCategory } from "@/lib/8004scan";
import type { RiskTolerance } from "@/lib/guardrails/types";

export interface TaskIntentHints {
  category?: MarketplaceCategory;
  asset?: string;
  amount?: string;
  risk?: RiskTolerance;
  walletAddress?: string;
  protocol?: string;
  pair?: string;
  capital?: string;
  portfolio?: string;
  objective?: string;
}

const ASSETS = ["USDC", "USDT", "BNB", "WBNB", "BUSD", "DAI", "CAKE", "ETH", "BTC"] as const;
const PROTOCOLS = ["Venus", "PancakeSwap", "Aave", "Lista", "Thena", "Kinza"] as const;

function inferCategory(text: string): MarketplaceCategory | undefined {
  if (/\b(health\s*factor|liquidat(?:e|ion)|collateral|lending\s+risk|monitor\s+(?:my\s+)?wallet)\b/i.test(text)) return "Health Factor Monitoring";
  if (/\b(grid\s*(?:trade|trading|bot)|range\s+(?:trade|trading|strategy))\b/i.test(text)) return "Grid Trading";
  if (/\b(rebalanc(?:e|ing)|asset\s+allocation|portfolio\s+allocation|change\s+my\s+allocation)\b/i.test(text)) return "Rebalancing";
  if (/\b(yield|apy|apr|farm(?:ing)?|vault|earn\s+(?:on|with)|best\s+return)\b/i.test(text)) return "Yield Optimisation";
  return undefined;
}

function inferAsset(text: string): string | undefined {
  const upper = text.toUpperCase();
  return ASSETS.find((asset) => new RegExp(`\\b${asset}\\b`).test(upper));
}

function inferAmount(text: string, asset?: string): string | undefined {
  const escapedAsset = asset?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escapedAsset) {
    const before = text.match(new RegExp(`(?:\\$\\s*)?([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*${escapedAsset}\\b`, "i"));
    if (before?.[1]) return before[1].replace(/,/g, "");
    const after = text.match(new RegExp(`\\b${escapedAsset}\\s*(?:worth\\s*)?(?:of\\s*)?(?:\\$\\s*)?([0-9][0-9,]*(?:\\.[0-9]+)?)`, "i"));
    if (after?.[1]) return after[1].replace(/,/g, "");
  }
  const generic = text.match(/(?:\$\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:dollars?|usd)\b/i);
  return generic?.[1]?.replace(/,/g, "");
}

function inferRisk(text: string): RiskTolerance | undefined {
  if (/\b(low(?:er)?\s+risk|conservative|safer|safe\s+risk)\b/i.test(text)) return "low";
  if (/\b(high(?:er)?\s+risk|aggressive)\b/i.test(text)) return "high";
  if (/\b(moderate\s+risk|medium\s+risk|balanced\s+risk)\b/i.test(text)) return "moderate";
  return undefined;
}

function inferProtocol(text: string): string | undefined {
  return PROTOCOLS.find((protocol) => new RegExp(`\\b${protocol.replace(/([A-Z])/g, " $1").trim().replace(/\s+/g, "\\s*")}\\b`, "i").test(text));
}

function inferPortfolio(text: string): string | undefined {
  const allocations: string[] = [];
  const percentageFirst = /\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:in\s+)?([A-Za-z0-9]{2,12})\b/g;
  const assetFirst = /\b([A-Za-z0-9]{2,12})\s*(?:at|is|:)??\s*(\d{1,3}(?:\.\d+)?)\s*%/g;
  let match: RegExpExecArray | null;

  while ((match = percentageFirst.exec(text)) !== null) allocations.push(`${match[2].toUpperCase()} ${match[1]}%`);
  while ((match = assetFirst.exec(text)) !== null) {
    const rendered = `${match[1].toUpperCase()} ${match[2]}%`;
    if (!allocations.includes(rendered)) allocations.push(rendered);
  }
  return allocations.length ? allocations.join(", ") : undefined;
}

function inferObjective(text: string): string | undefined {
  if (/\b(lower|reduce|minimi[sz]e)\s+(?:my\s+)?risk|\bsafer\b/i.test(text)) return "Lower portfolio risk";
  if (/\b(maximi[sz]e|increase|improve)\s+(?:my\s+)?yield|\bmore\s+yield\b/i.test(text)) return "Improve yield while respecting the stated risk preference";
  if (/\bdiversif(?:y|ication)\b/i.test(text)) return "Improve diversification";
  if (/\btarget\s+allocation\b/i.test(text)) return "Move toward the requested target allocation";
  return undefined;
}

export function inferTaskDetails(prompt: string): TaskIntentHints {
  const text = prompt.trim();
  if (!text) return {};

  const category = inferCategory(text);
  const asset = inferAsset(text);
  const amount = inferAmount(text, asset);
  const walletAddress = text.match(/0x[a-fA-F0-9]{40}/)?.[0];
  const pairMatch = text.toUpperCase().match(/\b([A-Z0-9]{2,10})\s*\/\s*([A-Z0-9]{2,10})\b/);
  const pair = pairMatch ? `${pairMatch[1]}/${pairMatch[2]}` : undefined;
  const protocol = inferProtocol(text);
  const risk = inferRisk(text);
  const portfolio = inferPortfolio(text);
  const objective = inferObjective(text);

  return {
    ...(category ? { category } : {}),
    ...(asset ? { asset } : {}),
    ...(amount ? { amount } : {}),
    ...(risk ? { risk } : {}),
    ...(walletAddress ? { walletAddress } : {}),
    ...(protocol ? { protocol } : {}),
    ...(pair ? { pair } : {}),
    ...(amount && asset ? { capital: `${amount} ${asset}` } : {}),
    ...(portfolio ? { portfolio } : {}),
    ...(objective ? { objective } : {}),
  };
}
