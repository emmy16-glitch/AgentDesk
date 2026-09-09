import type {
  AgentWalletAdvertisement,
  AgentWalletAdvertisementSource,
  AgentWalletProviderKind,
  AgentWalletProviderProfile,
} from "@/lib/agent-wallets/types";

const PROFILES: Record<AgentWalletProviderKind, AgentWalletProviderProfile> = {
  turnkey: {
    kind: "turnkey",
    label: "Turnkey",
    custody: "remote-enclave",
    externalPolicyEngineCapable: true,
    humanApprovalCapable: true,
    crossChainCapable: true,
    erc8183Capable: true,
    b402Capable: null,
    proofBoundary: "Turnkey can provide enclave-backed signing and policy controls, but an agent advertising Turnkey does not prove that a specific wallet policy is configured for this task.",
  },
  twak: {
    kind: "twak",
    label: "TWAK",
    custody: "external-wallet",
    externalPolicyEngineCapable: true,
    humanApprovalCapable: false,
    crossChainCapable: false,
    erc8183Capable: true,
    b402Capable: null,
    proofBoundary: "TWAK support describes wallet infrastructure; it does not prove the outcome of an ERC-8183 job or any task-specific policy state.",
  },
  altana: {
    kind: "altana",
    label: "Altana",
    custody: "onchain-session",
    externalPolicyEngineCapable: true,
    humanApprovalCapable: true,
    crossChainCapable: false,
    erc8183Capable: true,
    b402Capable: true,
    proofBoundary: "Altana wallet/session support is a capability claim. AgentDesk still requires task, hire and completion evidence separately.",
  },
  evm: {
    kind: "evm",
    label: "EVM wallet",
    custody: "local-key",
    externalPolicyEngineCapable: false,
    humanApprovalCapable: false,
    crossChainCapable: true,
    erc8183Capable: true,
    b402Capable: null,
    proofBoundary: "A generic EVM wallet identifies a signing shape only; it does not imply independent wallet-policy enforcement.",
  },
  unknown: {
    kind: "unknown",
    label: "Other wallet provider",
    custody: "unknown",
    externalPolicyEngineCapable: false,
    humanApprovalCapable: false,
    crossChainCapable: false,
    erc8183Capable: false,
    b402Capable: null,
    proofBoundary: "The registration advertises a wallet provider that AgentDesk does not currently classify. No policy or commerce capability is inferred.",
  },
};

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean.slice(0, 120) : null;
}

function providerKind(value: string): AgentWalletProviderKind {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (normalized === "turnkey" || normalized.includes("turnkey wallet")) return "turnkey";
  if (normalized === "twak" || normalized.includes("trust wallet agent kit")) return "twak";
  if (normalized === "altana" || normalized.includes("altana wallet")) return "altana";
  if (["evm", "evm wallet", "local evm", "private key", "local key"].includes(normalized)) return "evm";
  return "unknown";
}

function explicitProvider(root: Record<string, unknown>): { value: string; field: string } | null {
  const direct: Array<[string, unknown]> = [
    ["walletProvider", root.walletProvider],
    ["wallet_provider", root.wallet_provider],
    ["walletKind", root.walletKind],
    ["wallet_kind", root.wallet_kind],
  ];
  for (const [field, value] of direct) {
    const text = cleanString(value);
    if (text) return { value: text, field };
  }

  const nestedCandidates: Array<[string, Record<string, unknown> | null]> = [
    ["wallet", objectValue(root.wallet)],
    ["agentWallet", objectValue(root.agentWallet)],
    ["agent_wallet", objectValue(root.agent_wallet)],
    ["walletInfrastructure", objectValue(root.walletInfrastructure)],
    ["wallet_infrastructure", objectValue(root.wallet_infrastructure)],
  ];
  for (const [prefix, nested] of nestedCandidates) {
    if (!nested) continue;
    for (const key of ["provider", "kind", "type"]) {
      const text = cleanString(nested[key]);
      if (text) return { value: text, field: `${prefix}.${key}` };
    }
  }
  return null;
}

function capabilities(root: Record<string, unknown>): string[] {
  const wallet = objectValue(root.wallet);
  const agentWallet = objectValue(root.agentWallet) ?? objectValue(root.agent_wallet);
  const candidates = [
    root.walletCapabilities,
    root.wallet_capabilities,
    wallet?.capabilities,
    agentWallet?.capabilities,
  ];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate
      .flatMap((entry) => cleanString(entry) ? [cleanString(entry)!] : [])
      .slice(0, 20);
  }
  return [];
}

function booleanAt(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "enabled", "yes", "required"].includes(normalized)) return true;
    if (["false", "disabled", "no"].includes(normalized)) return false;
  }
  return null;
}

function policyFlags(root: Record<string, unknown>): { policyConfigured: boolean | null; humanApprovalConfigured: boolean | null } {
  const wallet = objectValue(root.wallet);
  const policy = objectValue(root.walletPolicy)
    ?? objectValue(root.wallet_policy)
    ?? objectValue(wallet?.policy);

  const policyConfigured = booleanAt(root.walletPolicyEnabled)
    ?? booleanAt(root.wallet_policy_enabled)
    ?? booleanAt(policy?.enabled)
    ?? null;

  const humanApprovalConfigured = booleanAt(root.humanApprovalRequired)
    ?? booleanAt(root.human_approval_required)
    ?? booleanAt(policy?.humanApprovalRequired)
    ?? booleanAt(policy?.human_approval_required)
    ?? booleanAt(policy?.requireConsensus)
    ?? booleanAt(policy?.require_consensus)
    ?? null;

  return { policyConfigured, humanApprovalConfigured };
}

export function walletProviderProfile(kind: AgentWalletProviderKind): AgentWalletProviderProfile {
  return PROFILES[kind];
}

/**
 * Reads only explicit structured wallet fields. Marketing prose such as an
 * agent description mentioning "Turnkey" is intentionally ignored.
 */
export function extractAgentWalletAdvertisement(
  value: unknown,
  source: AgentWalletAdvertisementSource,
): AgentWalletAdvertisement | null {
  const root = objectValue(value);
  if (!root) return null;
  const provider = explicitProvider(root);
  if (!provider) return null;

  const kind = providerKind(provider.value);
  const profile = walletProviderProfile(kind);
  const flags = policyFlags(root);
  return {
    provider: kind,
    providerLabel: kind === "unknown" ? provider.value : profile.label,
    source,
    sourceField: provider.field,
    advertisedCapabilities: capabilities(root),
    policyConfigured: flags.policyConfigured,
    humanApprovalConfigured: flags.humanApprovalConfigured,
  };
}
