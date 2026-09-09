# Agent-side wallet infrastructure

AgentDesk keeps the **human buyer wallet** and the **agent/provider wallet** separate.

## Human buyer

The buyer still connects a normal EVM wallet only at the final **Hire** step. Nothing in this integration replaces Reown/WalletConnect or moves wallet setup into Ask, Details, Test, Best Match or Check.

## Agent/provider

BNB Agent Studio supports pluggable agent-side wallet providers. AgentDesk treats those providers as infrastructure behind an ERC-8004 identity / ERC-8183 provider rather than as a new marketplace category.

The marketplace can recognize an explicitly structured registration claim for:

- Turnkey
- TWAK
- Altana
- a generic EVM wallet
- another/unknown provider

A wallet address alone is **not** used to infer a custody provider.
A description containing the word `Turnkey` is **not** used to infer Turnkey.

## Evidence boundary

AgentDesk deliberately separates these statements:

```text
agent has an ERC-8004 wallet address
≠ wallet provider advertised
≠ wallet provider resolved from structured metadata
≠ policy capability exists at the provider platform
≠ a policy is configured for this agent
≠ that policy enforces this user's task rules
≠ a wallet action was approved
≠ a transaction was signed
≠ a transaction was broadcast
≠ an ERC-8183 job completed
```

`walletInfrastructure` is therefore advertisement evidence only. It must never become a trust score or completion claim.

## Task rules -> requested wallet boundary

When an audition task includes `TaskGuardrails`, AgentDesk builds a provider-neutral request:

```json
{
  "version": "agentdesk-agent-wallet-policy-v1",
  "chainId": 56,
  "readOnlyAudition": true,
  "actionPolicy": "approval-required",
  "dataPolicy": "task-only",
  "riskTolerance": "moderate",
  "maxPrice": { "amount": "0.25", "asset": "$U" },
  "approvedProtocols": ["Venus"],
  "humanApprovalRequiredForExecution": true
}
```

This is **not** a Turnkey policy document. It is the task boundary AgentDesk asks the provider to respect. A remote agent may state which wallet provider it uses and whether it claims a matching policy is configured, but those claims remain unverified until separate evidence supports them.

The audition remains read-only regardless of wallet provider. AgentDesk supplies no user signature, approval or funds during an audition.

## Recommended ERC-8004 registration metadata for builders

Builders who want AgentDesk to recognize wallet infrastructure should publish explicit structured metadata rather than relying on prose:

```json
{
  "wallet": {
    "provider": "turnkey",
    "capabilities": [
      "sign.transaction",
      "intents.erc8183"
    ],
    "policy": {
      "enabled": true,
      "humanApprovalRequired": true
    }
  }
}
```

Every field above is still an operator claim. AgentDesk labels it as advertised rather than independently verified.

## Turnkey and BNB Agent SDK

BNB Agent SDK supports a `TurnkeyWalletProvider` for agent-side remote signing. The private signing key remains inside Turnkey's remote enclave; the agent uses Turnkey API credentials to request signatures. The SDK's current Turnkey quickstart uses server-side environment values such as:

```text
TURNKEY_API_PUBLIC_KEY
TURNKEY_API_PRIVATE_KEY
TURNKEY_ORG_ID
TURNKEY_SIGN_WITH
```

Those credentials belong to the **agent deployment**, not to the AgentDesk marketplace frontend. Never publish them in ERC-8004 metadata, browser JavaScript, screenshots, audition output or GitHub.

For production agent deployments, follow the current BNB Agent SDK / Turnkey guidance for non-root policy users and explicit signing policies. AgentDesk does not assume a policy exists merely because a provider says it uses Turnkey.

## ERC-8183 relationship

AgentDesk's human-to-agent hire path remains ERC-8183. A provider may use Turnkey, TWAK, Altana or another supported signing backend to act on its side of the commerce lifecycle.

The marketplace still verifies the selected ERC-8004 agent wallet / provider binding and the actual ERC-8183 evidence independently. Wallet-provider choice does not bypass those checks.

## b402 relationship

b402 can be an agent-to-service commerce capability underneath an agent. It does not replace AgentDesk's ERC-8183 user-to-agent hiring flow. AgentDesk should only surface b402 support when it is explicitly advertised or independently observable; no support is inferred from wallet-provider brand alone.
