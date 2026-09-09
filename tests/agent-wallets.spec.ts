import { expect, test } from "@playwright/test";
import { buildAuditionPrompt } from "@/lib/auditions/task-prompt";
import { parseStructuredAuditionClaims } from "@/lib/auditions/structured-output";
import type { AuditionTask } from "@/lib/auditions/types";
import { buildAgentWalletPolicyRequest } from "@/lib/agent-wallets/policy";
import { extractAgentWalletAdvertisement, walletProviderProfile } from "@/lib/agent-wallets/providers";
import type { TaskGuardrails } from "@/lib/guardrails/types";

const guardrails: TaskGuardrails = {
  riskTolerance: "moderate",
  maxPrice: { amount: "0.25", asset: "$U" },
  approvedProtocols: ["Venus"],
  actionPolicy: "approval-required",
  dataPolicy: "task-only",
};

const yieldTask: AuditionTask = {
  category: "Yield Optimisation",
  asset: "USDC",
  amount: "500",
  riskPreference: "moderate",
  guardrails,
};

test("explicit Turnkey registration metadata is recognized without inventing enforcement", () => {
  const advertisement = extractAgentWalletAdvertisement({
    wallet: {
      provider: "turnkey",
      capabilities: ["sign.transaction", "intents.erc8183"],
      policy: { enabled: true, humanApprovalRequired: true },
    },
  }, "erc8004-metadata");

  expect(advertisement).toMatchObject({
    provider: "turnkey",
    providerLabel: "Turnkey",
    source: "erc8004-metadata",
    sourceField: "wallet.provider",
    policyConfigured: true,
    humanApprovalConfigured: true,
  });
  expect(advertisement?.advertisedCapabilities).toEqual(["sign.transaction", "intents.erc8183"]);
});

test("a marketing description mentioning Turnkey is deliberately ignored", () => {
  const advertisement = extractAgentWalletAdvertisement({
    name: "Yield agent",
    description: "Built with Turnkey for secure wallet operations",
  }, "erc8004-metadata");
  expect(advertisement).toBeNull();
});

test("nested wallet-provider aliases are recognized and unknown providers stay unknown", () => {
  expect(extractAgentWalletAdvertisement({ agentWallet: { kind: "Altana" } }, "erc8004-metadata")?.provider).toBe("altana");
  const unknown = extractAgentWalletAdvertisement({ walletProvider: "FutureCustody" }, "erc8004-metadata");
  expect(unknown).toMatchObject({ provider: "unknown", providerLabel: "FutureCustody" });
});

test("Turnkey profile describes capability but explicitly refuses to prove a configured policy", () => {
  const profile = walletProviderProfile("turnkey");
  expect(profile).toMatchObject({
    externalPolicyEngineCapable: true,
    humanApprovalCapable: true,
    crossChainCapable: true,
    erc8183Capable: true,
  });
  expect(profile.proofBoundary.toLowerCase()).toContain("does not prove");
});

test("task guardrails become a provider-neutral agent-wallet policy request", () => {
  expect(buildAgentWalletPolicyRequest(yieldTask)).toEqual({
    version: "agentdesk-agent-wallet-policy-v1",
    chainId: 56,
    readOnlyAudition: true,
    actionPolicy: "approval-required",
    dataPolicy: "task-only",
    riskTolerance: "moderate",
    maxPrice: { amount: "0.25", asset: "$U" },
    approvedProtocols: ["Venus"],
    humanApprovalRequiredForExecution: true,
  });
});

test("tasks without guardrails do not invent wallet-policy requirements", () => {
  expect(buildAgentWalletPolicyRequest({
    category: "Yield Optimisation",
    asset: "USDC",
    amount: "500",
  })).toBeNull();
});

test("audition prompt keeps wallet execution read-only and wallet claims optional", () => {
  const prompt = buildAuditionPrompt(yieldTask);
  expect(prompt).toContain("Agent-side wallet boundary:");
  expect(prompt).toContain("must not sign, broadcast, approve, trade, move funds or create an irreversible action");
  expect(prompt).toContain("walletProvider");
  expect(prompt).toContain("walletPolicyEnforced");
  expect(prompt).toContain("humanApprovalRequired");
  expect(prompt).toContain("provider claims, not AgentDesk verification");
});

test("structured outputs can carry provider wallet claims without upgrading them to proof", () => {
  const parsed = parseStructuredAuditionClaims(
    '{"agentdesk":{"protocol":"Venus","walletProvider":"Turnkey","walletPolicyEnforced":true,"humanApprovalRequired":true}}',
    "Yield Optimisation",
  );
  expect(parsed.agentdesk).toMatchObject({
    protocol: "Venus",
    walletProvider: "Turnkey",
    walletPolicyEnforced: true,
    humanApprovalRequired: true,
  });
});
