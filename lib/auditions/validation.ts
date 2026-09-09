import type { AuditionRequest, AuditionTask } from "@/lib/auditions/types";
import type { ActionPolicy, DataPolicy, RiskTolerance, TaskGuardrails } from "@/lib/guardrails/types";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown, maxLength = 1000): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

function parseGuardrails(value: unknown): TaskGuardrails | undefined | null {
  if (value === undefined) return undefined;
  const raw = record(value);
  if (!raw) return null;
  const actionPolicy = oneOf<ActionPolicy>(raw.actionPolicy, ["analysis-only", "propose-only", "approval-required"]);
  const dataPolicy = oneOf<DataPolicy>(raw.dataPolicy, ["task-only", "public-wallet-only"]);
  if (!actionPolicy || !dataPolicy) return null;
  const riskTolerance = oneOf<RiskTolerance>(raw.riskTolerance, ["low", "moderate", "high"]);
  if (raw.riskTolerance !== undefined && !riskTolerance) return null;
  const rawProtocols = raw.approvedProtocols;
  if (rawProtocols !== undefined && (!Array.isArray(rawProtocols) || rawProtocols.length > 8)) return null;
  const approvedProtocols = Array.isArray(rawProtocols)
    ? rawProtocols.map((item) => cleanString(item, 80)).filter((item): item is string => Boolean(item))
    : undefined;
  if (Array.isArray(rawProtocols) && approvedProtocols?.length !== rawProtocols.length) return null;
  const rawPrice = raw.maxPrice;
  let maxPrice: TaskGuardrails["maxPrice"];
  if (rawPrice !== undefined) {
    const price = record(rawPrice);
    const amount = price ? cleanString(price.amount, 50) : undefined;
    const asset = price ? cleanString(price.asset, 30) : undefined;
    if (!amount || !asset || !/^\d+(?:\.\d+)?$/.test(amount)) return null;
    maxPrice = { amount, asset };
  }
  return { ...(riskTolerance ? { riskTolerance } : {}), ...(maxPrice ? { maxPrice } : {}), ...(approvedProtocols ? { approvedProtocols } : {}), actionPolicy, dataPolicy };
}

export function parseAuditionTask(value: unknown): AuditionTask | null {
  const task = record(value);
  if (!task) return null;

  const category = cleanString(task.category, 80);
  const instructions = cleanString(task.instructions, 2000);
  const guardrails = parseGuardrails(task.guardrails);
  if (guardrails === null) return null;

  if (category === "Health Factor Monitoring") {
    const wallet = cleanString(task.wallet, 200);
    if (!wallet) return null;
    const protocol = cleanString(task.protocol, 200);
    const goal = cleanString(task.goal, 1000);
    return {
      category,
      wallet,
      ...(protocol ? { protocol } : {}),
      ...(goal ? { goal } : {}),
      ...(instructions ? { instructions } : {}),
      ...(guardrails ? { guardrails } : {}),
    };
  }

  if (category === "Yield Optimisation") {
    const asset = cleanString(task.asset, 100);
    const amount = cleanString(task.amount, 100);
    if (!asset || !amount) return null;
    const riskPreference = cleanString(task.riskPreference, 500);
    return {
      category,
      asset,
      amount,
      ...(riskPreference ? { riskPreference } : {}),
      ...(instructions ? { instructions } : {}),
      ...(guardrails ? { guardrails } : {}),
    };
  }

  if (category === "Grid Trading") {
    const pair = cleanString(task.pair, 100);
    const capital = cleanString(task.capital, 100);
    if (!pair || !capital) return null;
    const priceRange = cleanString(task.priceRange, 200);
    const riskPreference = cleanString(task.riskPreference, 500);
    return {
      category,
      pair,
      capital,
      ...(priceRange ? { priceRange } : {}),
      ...(riskPreference ? { riskPreference } : {}),
      ...(instructions ? { instructions } : {}),
      ...(guardrails ? { guardrails } : {}),
    };
  }

  if (category === "Rebalancing") {
    const portfolio = cleanString(task.portfolio, 1000);
    const objective = cleanString(task.objective, 1000);
    if (!portfolio || !objective) return null;
    return {
      category,
      portfolio,
      objective,
      ...(instructions ? { instructions } : {}),
      ...(guardrails ? { guardrails } : {}),
    };
  }

  return null;
}

export function parseAuditionRequest(value: unknown): AuditionRequest | null {
  const body = record(value);
  if (!body) return null;

  const tokenId = Number(body.tokenId);
  const task = parseAuditionTask(body.task);
  if (!Number.isSafeInteger(tokenId) || tokenId < 0 || !task) return null;
  return { tokenId, task };
}

export interface BatchAuditionRequest {
  tokenIds: number[];
  task: AuditionTask;
}

export function parseBatchAuditionRequest(value: unknown): BatchAuditionRequest | null {
  const body = record(value);
  if (!body || !Array.isArray(body.tokenIds)) return null;

  const task = parseAuditionTask(body.task);
  if (!task) return null;

  const tokenIds = [...new Set(body.tokenIds.map(Number))];
  if (
    tokenIds.length < 1 ||
    tokenIds.length > 4 ||
    tokenIds.some((tokenId) => !Number.isSafeInteger(tokenId) || tokenId < 0)
  ) return null;

  return { tokenIds, task };
}
