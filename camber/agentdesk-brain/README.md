# AgentDesk Brain — Camber Context Bundle

This folder is the source-controlled context for the Camber agent used as AgentDesk's evidence analyst.

The Brain is **not** an ERC-8004 seller and is **not** proof. It explains evidence already produced by AgentDesk.

## Recommended Camber agent

- Name: `AgentDesk Brain`
- Alias: `agentdesk-brain`
- Description: `Evidence analyst for AgentDesk BNB agent auditions. Explains verified, unresolved and conflicting claims without creating proof.`
- Structured output: enabled

## What to sync

- `instruction.md` → agent instructions
- `knowledge-base/` → searchable evidence rules
- `schema/` → structured output contract
- `skills/` → four category-specific reasoning skills

Camber Context Mirror requires a real Camber agent and authenticated Camber CLI/MCP session. AgentDesk cannot create that account-side resource from an unauthenticated deployment.

## Runtime configuration

AgentDesk uses the Camber Brain only when all of the following are true:

```text
CAMBER_BRAIN_ENABLED=true
CAMBER_BRAIN_AGENT_TAG=@<owner>.agentdesk-brain
CAMBER_API_KEY=<server-only token>
CAMBER_CLI_PATH=camber
```

If Camber is not configured or is temporarily unavailable, AgentDesk falls back to its deterministic evidence engine and labels the fallback explicitly. Raw verification states are unchanged either way.

## Zero-funds category depth

Health, Yield, Grid and Rebalancing checks are read-only. Yield/Grid capital fields are scenarios; no deposit, approval, order or trade is required to demonstrate category depth.
