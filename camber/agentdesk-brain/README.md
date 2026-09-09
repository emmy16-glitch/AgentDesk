# AgentDesk Brain — Camber Context Bundle

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live product docs:** https://agentdesk-bnb-eight.vercel.app/docs/

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

Camber Context Mirror requires a real Camber agent and authenticated Camber CLI/MCP session. AgentDesk cannot truthfully create or claim that account-side resource from an unauthenticated deployment.

## Configure/sync an existing Camber agent

After creating `AgentDesk Brain` once in the Camber web app with alias `agentdesk-brain`, configure local credentials and run:

```bash
export CAMBER_API_KEY=<your-camber-api-token>
export CAMBER_BRAIN_AGENT_TAG=@<owner>.agentdesk-brain
npm run camber:brain:configure
```

The helper updates the agent instructions, pulls its current Context Mirror, overlays this source-controlled bundle, then pushes the result as the next stable Camber agent version. The current Camber CLI requires authenticated account access for this step.

## Runtime configuration

AgentDesk uses the Camber Brain only when all of the following are true:

```text
CAMBER_BRAIN_ENABLED=true
CAMBER_BRAIN_AGENT_TAG=@<owner>.agentdesk-brain
CAMBER_API_KEY=<server-only token>
CAMBER_CLI_PATH=camber
```

The current runtime adapter invokes the Camber CLI. Therefore the host must actually provide the `camber` executable; setting an environment variable alone does not install the CLI. A normal serverless/Vercel runtime should leave Camber disabled unless that executable is deliberately provided. The category-depth product remains fully functional through AgentDesk's deterministic evidence engine when Camber is unavailable.

Camber also exposes a remote MCP service for connected OAuth-capable MCP clients. AgentDesk does not silently substitute that interactive OAuth connection for a server-side credential because doing so would make deployment/authentication claims we cannot verify.

If Camber is not configured or is temporarily unavailable, AgentDesk falls back to its deterministic evidence engine and labels the fallback explicitly. Raw verification states are unchanged either way.

## Zero-funds category depth

Health, Yield, Grid and Rebalancing checks are read-only. Yield/Grid capital fields are scenarios; no deposit, approval, order or trade is required to demonstrate category depth.
