import { parseStructuredAuditionClaims } from "@/lib/auditions/structured-output";
import type { AuditionQuote, AuditionResult } from "@/lib/auditions/types";
import type { RuleCheck, RuleEvaluation, TaskGuardrails } from "@/lib/guardrails/types";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function decimalParts(value: string): { whole: string; fraction: string } | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  return { whole: match[1].replace(/^0+(?=\d)/, ""), fraction: match[2] ?? "" };
}

function compareDecimal(left: string, right: string): number | null {
  const a = decimalParts(left);
  const b = decimalParts(right);
  if (!a || !b) return null;
  const maxFraction = Math.max(a.fraction.length, b.fraction.length);
  const leftValue = `${a.whole}${a.fraction.padEnd(maxFraction, "0")}`.replace(/^0+(?=\d)/, "");
  const rightValue = `${b.whole}${b.fraction.padEnd(maxFraction, "0")}`.replace(/^0+(?=\d)/, "");
  if (leftValue.length !== rightValue.length) return leftValue.length < rightValue.length ? -1 : 1;
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1;
}

function protocolFrom(result: AuditionResult): string | null {
  if (!result.output) return null;
  const claims = parseStructuredAuditionClaims(result.output, result.task.category);
  return claims.agentdesk?.protocol
    ?? claims.health?.protocol
    ?? claims.yield?.protocol
    ?? claims.yield?.venue
    ?? claims.grid?.venue
    ?? claims.rebalance?.protocol
    ?? null;
}

function riskFrom(result: AuditionResult): string | null {
  if (!result.output) return null;
  const claims = parseStructuredAuditionClaims(result.output, result.task.category);
  return claims.agentdesk?.riskLevel ?? claims.health?.liquidationRisk ?? null;
}

function requiresExecutionFrom(result: AuditionResult): boolean | null {
  if (!result.output) return null;
  return parseStructuredAuditionClaims(result.output, result.task.category).agentdesk?.requiresExecution ?? null;
}

export function evaluatePriceLimit(quote: AuditionQuote | null, limit: TaskGuardrails["maxPrice"]): RuleCheck | null {
  if (!limit) return null;
  if (!quote) return { id: "price", label: "Price limit", status: "unknown", summary: "Price couldn’t be confirmed." };
  if (normalize(quote.asset) !== normalize(limit.asset)) {
    return { id: "price", label: "Price limit", status: "unknown", summary: "Price uses a different asset, so it couldn’t be compared." };
  }
  const comparison = compareDecimal(quote.amount, limit.amount);
  if (comparison === null) return { id: "price", label: "Price limit", status: "unknown", summary: "Price format couldn’t be compared to your limit." };
  if (comparison <= 0) {
    return { id: "price", label: "Price limit", status: "pass", summary: `${quote.amount} ${quote.asset} is within your ${limit.amount} ${limit.asset} limit.` };
  }
  return { id: "price", label: "Price limit", status: "fail", summary: `${quote.amount} ${quote.asset} is above your ${limit.amount} ${limit.asset} limit.` };
}

function checkPrice(result: AuditionResult, guardrails: TaskGuardrails): RuleCheck | null {
  return evaluatePriceLimit(result.quote, guardrails.maxPrice);
}

function checkProtocol(result: AuditionResult, guardrails: TaskGuardrails): RuleCheck | null {
  const allowed = guardrails.approvedProtocols?.map(normalize).filter(Boolean) ?? [];
  if (!allowed.length) return null;
  const protocol = protocolFrom(result);
  if (!protocol) return { id: "protocol", label: "Allowed protocol", status: "unknown", summary: "Protocol couldn’t be confirmed." };
  if (allowed.includes(normalize(protocol))) return { id: "protocol", label: "Allowed protocol", status: "pass", summary: `${protocol} matches your allowed protocol.` };
  return { id: "protocol", label: "Allowed protocol", status: "fail", summary: `${protocol} doesn’t meet your protocol rule.` };
}

function checkRisk(result: AuditionResult, guardrails: TaskGuardrails): RuleCheck | null {
  if (!guardrails.riskTolerance) return null;
  const returnedRisk = riskFrom(result);
  if (!returnedRisk) return { id: "risk", label: "Risk level", status: "unknown", summary: "Risk level couldn’t be confirmed." };
  const levels = ["low", "moderate", "high"];
  const requested = levels.indexOf(normalize(guardrails.riskTolerance));
  const observed = levels.indexOf(normalize(returnedRisk));
  if (observed < 0) return { id: "risk", label: "Risk level", status: "unknown", summary: "Risk level couldn’t be compared." };
  if (observed <= requested) return { id: "risk", label: "Risk level", status: "pass", summary: `${returnedRisk[0].toUpperCase()}${returnedRisk.slice(1)} risk is within your preference.` };
  return { id: "risk", label: "Risk level", status: "fail", summary: `${returnedRisk[0].toUpperCase()}${returnedRisk.slice(1)} risk is above your preference.` };
}

function checkAction(result: AuditionResult, guardrails: TaskGuardrails): RuleCheck {
  const requiresExecution = requiresExecutionFrom(result);
  if (requiresExecution === true && guardrails.actionPolicy !== "approval-required") {
    return { id: "action", label: "Action permission", status: "fail", summary: "This result requires an action beyond the permission you set." };
  }
  return { id: "action", label: "Action permission", status: "pass", summary: "AgentDesk did not authorize or execute a transaction during this audition." };
}

export function evaluateTaskGuardrails(result: AuditionResult, guardrails = result.task.guardrails): RuleEvaluation {
  if (!guardrails) return { status: "fits", checks: [], hardFailure: false, passedCount: 0, failedCount: 0, unknownCount: 0 };
  const checks = [checkPrice(result, guardrails), checkProtocol(result, guardrails), checkRisk(result, guardrails), checkAction(result, guardrails)].filter((check): check is RuleCheck => Boolean(check));
  const passedCount = checks.filter((check) => check.status === "pass").length;
  const failedCount = checks.filter((check) => check.status === "fail").length;
  const unknownCount = checks.filter((check) => check.status === "unknown").length;
  const hardFailure = checks.some((check) => check.status === "fail" && (check.id === "price" || check.id === "protocol" || check.id === "action"));
  return { status: hardFailure || failedCount ? "conflict" : unknownCount ? "partial" : "fits", checks, hardFailure, passedCount, failedCount, unknownCount };
}
