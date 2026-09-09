import type { AuditionTask } from "@/lib/auditions/types";

export interface StructuredHealthClaims {
  healthFactor: number | null;
  shortfall: number | null;
  liquidationRisk: string | null;
  protocol: string | null;
}

export interface StructuredYieldClaims {
  protocol: string | null;
  venue: string | null;
  pair: string | null;
  poolAddress: string | null;
  estimatedApyPct: number | null;
}

export interface StructuredGridClaims {
  venue: string | null;
  pair: string | null;
  lowerPrice: number | null;
  upperPrice: number | null;
  gridCount: number | null;
  feeTier: number | null;
}

export interface StructuredRebalanceClaims {
  protocol: string | null;
  targetAllocations: Record<string, number>;
}

export interface StructuredAuditionClaims {
  detected: boolean;
  category: AuditionTask["category"];
  raw: Record<string, unknown> | null;
  health?: StructuredHealthClaims;
  yield?: StructuredYieldClaims;
  grid?: StructuredGridClaims;
  rebalance?: StructuredRebalanceClaims;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const normalized = value.replace(/[%,$]/g, "").trim();
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function jsonCandidates(output: string): string[] {
  const candidates: string[] = [];
  const trimmed = output.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) candidates.push(trimmed);

  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const match of output.matchAll(fence)) {
    const body = match[1]?.trim();
    if (body?.startsWith("{") && body.endsWith("}")) candidates.push(body);
  }

  const first = output.indexOf("{");
  const last = output.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(output.slice(first, last + 1));
  return [...new Set(candidates)];
}

function findClaimObject(value: Record<string, unknown>): Record<string, unknown> {
  const preferred = ["agentdesk", "claims", "analysis", "result", "data"];
  for (const key of preferred) {
    const nested = objectValue(value[key]);
    if (nested) return nested;
  }
  return value;
}

function parseAllocations(value: unknown): Record<string, number> {
  const result: Record<string, number> = {};
  const direct = objectValue(value);
  if (direct) {
    for (const [asset, weight] of Object.entries(direct)) {
      const parsed = numberValue(weight);
      if (parsed !== null) result[asset.toUpperCase()] = parsed;
    }
    return result;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const object = objectValue(entry);
      if (!object) continue;
      const asset = stringValue(object.asset, object.token, object.symbol);
      const weight = numberValue(object.percent, object.percentage, object.weight, object.allocation);
      if (asset && weight !== null) result[asset.toUpperCase()] = weight;
    }
  }
  return result;
}

export function parseStructuredAuditionClaims(output: string, category: AuditionTask["category"]): StructuredAuditionClaims {
  for (const candidate of jsonCandidates(output)) {
    try {
      const parsed = JSON.parse(candidate);
      const root = objectValue(parsed);
      if (!root) continue;
      const claims = findClaimObject(root);

      if (category === "Health Factor Monitoring") {
        const health = objectValue(claims.health) ?? claims;
        return {
          detected: true,
          category,
          raw: root,
          health: {
            healthFactor: numberValue(health.healthFactor, health.health_factor),
            shortfall: numberValue(health.shortfall, health.accountShortfall, health.account_shortfall),
            liquidationRisk: stringValue(health.liquidationRisk, health.liquidation_risk, health.risk, health.status),
            protocol: stringValue(health.protocol, claims.protocol),
          },
        };
      }

      if (category === "Yield Optimisation") {
        const yieldClaims = objectValue(claims.yield) ?? claims;
        return {
          detected: true,
          category,
          raw: root,
          yield: {
            protocol: stringValue(yieldClaims.protocol),
            venue: stringValue(yieldClaims.venue, yieldClaims.exchange),
            pair: stringValue(yieldClaims.pair, yieldClaims.market),
            poolAddress: stringValue(yieldClaims.poolAddress, yieldClaims.pool_address, yieldClaims.pool),
            estimatedApyPct: numberValue(yieldClaims.estimatedApyPct, yieldClaims.estimated_apy_pct, yieldClaims.apy, yieldClaims.apyPct),
          },
        };
      }

      if (category === "Grid Trading") {
        const grid = objectValue(claims.grid) ?? claims;
        return {
          detected: true,
          category,
          raw: root,
          grid: {
            venue: stringValue(grid.venue, grid.exchange, grid.protocol),
            pair: stringValue(grid.pair, grid.market),
            lowerPrice: numberValue(grid.lowerPrice, grid.lower_price, grid.minPrice, grid.min_price, grid.lower),
            upperPrice: numberValue(grid.upperPrice, grid.upper_price, grid.maxPrice, grid.max_price, grid.upper),
            gridCount: numberValue(grid.gridCount, grid.grid_count, grid.grids, grid.levels),
            feeTier: numberValue(grid.feeTier, grid.fee_tier, grid.fee),
          },
        };
      }

      const rebalance = objectValue(claims.rebalance) ?? claims;
      return {
        detected: true,
        category,
        raw: root,
        rebalance: {
          protocol: stringValue(rebalance.protocol, rebalance.venue),
          targetAllocations: parseAllocations(
            rebalance.targetAllocations
              ?? rebalance.target_allocations
              ?? rebalance.allocations
              ?? rebalance.weights,
          ),
        },
      };
    } catch {
      // Continue looking for another JSON candidate.
    }
  }

  return { detected: false, category, raw: null };
}
