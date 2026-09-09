import { keccak256, toBytes } from "viem";
import type { ActionPolicy } from "@/lib/guardrails/types";
import type { HireCapabilityPolicy, PaidToolId, ToolSpendLimit } from "@/lib/capabilities/types";

const PAID_TOOLS = new Set<PaidToolId>(["cournot", "telegraph"]);
const PERMISSION_DAYS = new Set([1, 7, 30]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : null;
}

function parseSpendLimit(value: unknown): ToolSpendLimit | null {
  const raw = record(value);
  if (!raw) return null;
  const amount = cleanString(raw.amount, 50);
  const asset = cleanString(raw.asset, 30);
  if (!amount || !asset || !/^\d+(?:\.\d+)?$/.test(amount) || Number(amount) <= 0) return null;
  return { amount, asset };
}

function parsePermissionDuration(value: unknown): 1 | 7 | 30 | null {
  const days = Number(value);
  return PERMISSION_DAYS.has(days) ? days as 1 | 7 | 30 : null;
}

export function defaultHireCapabilityPolicy(actionPolicy: ActionPolicy = "approval-required"): HireCapabilityPolicy {
  return {
    version: "agentdesk-hire-capabilities-v1",
    externalIntelligence: true,
    paidIntelligence: false,
    approvedPaidTools: [],
    execution: actionPolicy === "approval-required" ? "approval-required" : "disabled",
    permissionDurationDays: 7,
  };
}

export function parseHireCapabilityPolicy(value: unknown): HireCapabilityPolicy | null {
  const raw = record(value);
  if (!raw || raw.version !== "agentdesk-hire-capabilities-v1") return null;
  if (typeof raw.externalIntelligence !== "boolean" || typeof raw.paidIntelligence !== "boolean") return null;
  if (raw.execution !== "disabled" && raw.execution !== "approval-required") return null;
  const permissionDurationDays = parsePermissionDuration(raw.permissionDurationDays);
  if (!permissionDurationDays) return null;

  const toolValues = Array.isArray(raw.approvedPaidTools) ? raw.approvedPaidTools : [];
  if (toolValues.length > 8 || toolValues.some((tool) => typeof tool !== "string" || !PAID_TOOLS.has(tool as PaidToolId))) return null;
  const approvedPaidTools = [...new Set(toolValues as PaidToolId[])].sort();

  if (!raw.paidIntelligence) {
    return {
      version: "agentdesk-hire-capabilities-v1",
      externalIntelligence: raw.externalIntelligence,
      paidIntelligence: false,
      approvedPaidTools: [],
      execution: raw.execution,
      permissionDurationDays,
    };
  }

  if (!raw.externalIntelligence || !approvedPaidTools.length) return null;
  const maxToolSpend = parseSpendLimit(raw.maxToolSpend);
  if (!maxToolSpend) return null;

  return {
    version: "agentdesk-hire-capabilities-v1",
    externalIntelligence: true,
    paidIntelligence: true,
    approvedPaidTools,
    maxToolSpend,
    execution: raw.execution,
    permissionDurationDays,
  };
}

export function canonicalCapabilityPolicy(policy: HireCapabilityPolicy): string {
  const parsed = parseHireCapabilityPolicy(policy);
  if (!parsed) throw new Error("Invalid AgentDesk capability policy");
  return JSON.stringify({
    version: parsed.version,
    externalIntelligence: parsed.externalIntelligence,
    paidIntelligence: parsed.paidIntelligence,
    approvedPaidTools: [...parsed.approvedPaidTools].sort(),
    maxToolSpend: parsed.maxToolSpend ?? null,
    execution: parsed.execution,
    permissionDurationDays: parsed.permissionDurationDays,
  });
}

export function hashHireCapabilityPolicy(policy: HireCapabilityPolicy): `0x${string}` {
  return keccak256(toBytes(canonicalCapabilityPolicy(policy)));
}

export function capabilityPolicySummary(policy: HireCapabilityPolicy): string[] {
  const lines = [
    `External intelligence ${policy.externalIntelligence ? "allowed" : "off"}`,
    policy.paidIntelligence && policy.maxToolSpend
      ? `Paid calls max ${policy.maxToolSpend.amount} ${policy.maxToolSpend.asset}`
      : "Paid tools off",
    policy.execution === "approval-required" ? "Transactions ask first" : "Transaction execution off",
    `Expires after ${policy.permissionDurationDays} ${policy.permissionDurationDays === 1 ? "day" : "days"}`,
  ];
  if (policy.paidIntelligence && policy.approvedPaidTools.length) {
    lines.splice(2, 0, `Approved tools: ${policy.approvedPaidTools.map((tool) => tool === "cournot" ? "Cournot" : "Telegraph").join(", ")}`);
  }
  return lines;
}
