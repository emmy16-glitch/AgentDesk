import type { HireCapabilityPolicy } from "@/lib/capabilities/types";
import { paidToolDefinition } from "@/lib/capabilities/catalog";
import type { AuthorizationEvaluation, AuthorizationProposal } from "@/lib/authorization/types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
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
  const width = Math.max(a.fraction.length, b.fraction.length);
  const av = `${a.whole}${a.fraction.padEnd(width, "0")}`.replace(/^0+(?=\d)/, "");
  const bv = `${b.whole}${b.fraction.padEnd(width, "0")}`.replace(/^0+(?=\d)/, "");
  if (av.length !== bv.length) return av.length < bv.length ? -1 : 1;
  return av === bv ? 0 : av < bv ? -1 : 1;
}

export function evaluateCapabilityProposal(
  policy: HireCapabilityPolicy,
  proposal: AuthorizationProposal,
): AuthorizationEvaluation {
  const boundary = "This is a pre-execution policy decision. AgentDesk does not create wallet signatures or executable authority here.";

  if (proposal.kind === "external-intelligence") {
    if (!policy.externalIntelligence) {
      return {
        decision: "BLOCK",
        reason: "External intelligence is disabled for this hire.",
        checks: [{ id: "external-intelligence", status: "fail", summary: "The user did not allow external intelligence." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }
    return {
      decision: "ALLOW",
      reason: "Read-only external intelligence is allowed by the hire capability policy.",
      checks: [{ id: "external-intelligence", status: "pass", summary: "External intelligence is allowed." }],
      executable: false,
      source: "agentdesk-capability-policy",
      boundary,
    };
  }

  if (proposal.kind === "paid-tool-call") {
    if (!policy.paidIntelligence) {
      return {
        decision: "BLOCK",
        reason: "Paid intelligence is disabled for this hire.",
        checks: [{ id: "paid-intelligence", status: "fail", summary: "Paid tool calls are off." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    if (!proposal.toolId) {
      return {
        decision: "HOLD",
        reason: "The paid service was not identified.",
        checks: [{ id: "paid-tool", status: "unknown", summary: "AgentDesk cannot confirm that the requested paid tool is allowed." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    const tool = paidToolDefinition(proposal.toolId);
    if (!policy.approvedPaidTools.includes(proposal.toolId)) {
      return {
        decision: "BLOCK",
        reason: `${tool.label} is not in the approved paid-tool list for this hire.`,
        checks: [{ id: "paid-tool", status: "fail", summary: `${tool.label} is not approved.` }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    if (!policy.maxToolSpend || !proposal.amount || !proposal.asset) {
      return {
        decision: "HOLD",
        reason: "The paid call does not have enough bounded price information.",
        checks: [{ id: "tool-spend", status: "unknown", summary: "Price or spend limit could not be compared." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    if (normalize(policy.maxToolSpend.asset) !== normalize(proposal.asset)) {
      return {
        decision: "HOLD",
        reason: "The paid call uses a different asset from the user’s tool-spend limit.",
        checks: [{ id: "tool-spend", status: "unknown", summary: "Different payment assets cannot be compared without a verified conversion." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    const comparison = compareDecimal(proposal.amount, policy.maxToolSpend.amount);
    if (comparison === null) {
      return {
        decision: "HOLD",
        reason: "The paid call amount could not be compared safely.",
        checks: [{ id: "tool-spend", status: "unknown", summary: "Spend amount format could not be verified." }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    if (comparison > 0) {
      return {
        decision: "BLOCK",
        reason: "The paid call is above the user’s tool-spend limit.",
        checks: [{ id: "tool-spend", status: "fail", summary: `${proposal.amount} ${proposal.asset} exceeds the ${policy.maxToolSpend.amount} ${policy.maxToolSpend.asset} limit.` }],
        executable: false,
        source: "agentdesk-capability-policy",
        boundary,
      };
    }

    return {
      decision: "ALLOW",
      reason: `${tool.label} is approved and the quoted call is within the user’s spend limit.`,
      checks: [
        { id: "paid-tool", status: "pass", summary: `${tool.label} is approved.` },
        { id: "tool-spend", status: "pass", summary: `${proposal.amount} ${proposal.asset} is within the ${policy.maxToolSpend.amount} ${policy.maxToolSpend.asset} limit.` },
      ],
      executable: false,
      source: "agentdesk-capability-policy",
      boundary,
    };
  }

  if (policy.execution === "disabled") {
    return {
      decision: "BLOCK",
      reason: "Transaction execution is disabled for this hire.",
      checks: [{ id: "execution", status: "fail", summary: "The user did not grant transaction execution permission." }],
      executable: false,
      source: "agentdesk-capability-policy",
      boundary,
    };
  }

  return {
    decision: "HOLD",
    reason: "This transaction requires the user’s approval before execution.",
    checks: [{ id: "execution", status: "unknown", summary: "Human approval is required before a wallet may sign." }],
    executable: false,
    source: "agentdesk-capability-policy",
    boundary,
  };
}
