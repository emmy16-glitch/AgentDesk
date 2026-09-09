import { expect, test } from "@playwright/test";
import { evaluateCapabilityProposal } from "@/lib/authorization/policy";
import {
  defaultHireCapabilityPolicy,
  hashHireCapabilityPolicy,
  parseHireCapabilityPolicy,
  permissionExpirySeconds,
} from "@/lib/capabilities/policy";
import type { HireCapabilityPolicy } from "@/lib/capabilities/types";

const paidPolicy: HireCapabilityPolicy = {
  version: "agentdesk-hire-capabilities-v1",
  externalIntelligence: true,
  paidIntelligence: true,
  approvedPaidTools: ["cournot", "telegraph"],
  maxToolSpend: { amount: "0.25", asset: "$U" },
  execution: "approval-required",
  permissionDurationDays: 7,
};

test("default hire capabilities keep paid intelligence off", () => {
  expect(defaultHireCapabilityPolicy("approval-required")).toEqual({
    version: "agentdesk-hire-capabilities-v1",
    externalIntelligence: true,
    paidIntelligence: false,
    approvedPaidTools: [],
    execution: "approval-required",
    permissionDurationDays: 7,
  });
});

test("paid intelligence must declare an approved tool and bounded spend", () => {
  expect(parseHireCapabilityPolicy({
    version: "agentdesk-hire-capabilities-v1",
    externalIntelligence: true,
    paidIntelligence: true,
    approvedPaidTools: ["cournot"],
    execution: "approval-required",
    permissionDurationDays: 7,
  })).toBeNull();

  expect(parseHireCapabilityPolicy({
    version: "agentdesk-hire-capabilities-v1",
    externalIntelligence: true,
    paidIntelligence: true,
    approvedPaidTools: [],
    maxToolSpend: { amount: "0.10", asset: "$U" },
    execution: "approval-required",
    permissionDurationDays: 7,
  })).toBeNull();
});

test("permission duration only accepts the bounded supported windows", () => {
  expect(parseHireCapabilityPolicy({ ...paidPolicy, permissionDurationDays: 14 })).toBeNull();
  expect(parseHireCapabilityPolicy({ ...paidPolicy, permissionDurationDays: 1 })?.permissionDurationDays).toBe(1);
  expect(parseHireCapabilityPolicy({ ...paidPolicy, permissionDurationDays: 30 })?.permissionDurationDays).toBe(30);
});

test("ERC-8183 expiry follows the selected permission window", () => {
  const nowMs = Date.UTC(2026, 8, 9, 12, 0, 0);
  const nowSeconds = BigInt(Math.floor(nowMs / 1000));
  expect(permissionExpirySeconds(1, nowMs)).toBe(nowSeconds + 86_400n);
  expect(permissionExpirySeconds(7, nowMs)).toBe(nowSeconds + 7n * 86_400n);
  expect(permissionExpirySeconds(30, nowMs)).toBe(nowSeconds + 30n * 86_400n);
});

test("capability commitment changes when the user's permissions change", () => {
  const off = defaultHireCapabilityPolicy("approval-required");
  const on = paidPolicy;
  expect(hashHireCapabilityPolicy(off)).not.toBe(hashHireCapabilityPolicy(on));
  expect(hashHireCapabilityPolicy(on)).toBe(hashHireCapabilityPolicy({ ...on, approvedPaidTools: ["telegraph", "cournot"] }));
  expect(hashHireCapabilityPolicy(on)).not.toBe(hashHireCapabilityPolicy({ ...on, permissionDurationDays: 30 }));
});

test("an approved Cournot call within the user budget can pass policy preflight", () => {
  const result = evaluateCapabilityProposal(paidPolicy, {
    kind: "paid-tool-call",
    toolId: "cournot",
    amount: "0.01",
    asset: "$U",
  });
  expect(result.decision).toBe("ALLOW");
  expect(result.executable).toBe(false);
});

test("an unapproved paid tool is blocked", () => {
  const onlyCournot: HireCapabilityPolicy = { ...paidPolicy, approvedPaidTools: ["cournot"] };
  const result = evaluateCapabilityProposal(onlyCournot, {
    kind: "paid-tool-call",
    toolId: "telegraph",
    amount: "0.01",
    asset: "$U",
  });
  expect(result.decision).toBe("BLOCK");
  expect(result.executable).toBe(false);
});

test("paid tool calls above the per-call cap are blocked", () => {
  const result = evaluateCapabilityProposal(paidPolicy, {
    kind: "paid-tool-call",
    toolId: "cournot",
    amount: "0.30",
    asset: "$U",
  });
  expect(result.decision).toBe("BLOCK");
});

test("different payment assets remain unresolved rather than using an invented FX rate", () => {
  const result = evaluateCapabilityProposal(paidPolicy, {
    kind: "paid-tool-call",
    toolId: "cournot",
    amount: "0.01",
    asset: "BNB",
  });
  expect(result.decision).toBe("HOLD");
});

test("paid calls are blocked when the user leaves paid intelligence off", () => {
  const result = evaluateCapabilityProposal(defaultHireCapabilityPolicy("approval-required"), {
    kind: "paid-tool-call",
    toolId: "cournot",
    amount: "0.01",
    asset: "$U",
  });
  expect(result.decision).toBe("BLOCK");
});

test("transaction requests require human approval rather than becoming executable authority", () => {
  const result = evaluateCapabilityProposal(paidPolicy, {
    kind: "transaction",
    description: "Swap 400 USDC",
  });
  expect(result.decision).toBe("HOLD");
  expect(result.executable).toBe(false);
});

test("transaction requests are blocked when execution is disabled", () => {
  const result = evaluateCapabilityProposal({ ...paidPolicy, execution: "disabled" }, {
    kind: "transaction",
    description: "Swap 400 USDC",
  });
  expect(result.decision).toBe("BLOCK");
  expect(result.executable).toBe(false);
});