# Phase 5 — AgentDesk Brain + Four-Category Depth

## Goal

Make all four required task families feel like distinct, serious evidence products without requiring the builder or judge to spend trading capital.

The four categories are:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

This phase is read-only. Scenario capital is not a deposit and no trade/rebalance is executed.

## Category depth

### Health Factor Monitoring

Independent checks now include:
- valid/queryable BNB wallet context;
- current native BNB balance as context only;
- Venus Core `getAccountLiquidity` excess-liquidity / shortfall state;
- machine-readable agent shortfall direction compared against the live Venus read when supplied;
- explicit non-verifiable treatment for a free-text/numerical health factor that AgentDesk has not reconstructed.

### Yield Optimisation

Independent checks now include:
- canonical BNB token identity;
- live PancakeSwap V3 pair/pool context for supported assets;
- machine-readable pool-address comparison when an agent supplies one;
- APY remains explicitly **not verified** unless a future verifier reproduces the protocol-specific rate source.

The entered amount is scenario capital. No deposit or approval is required.

### Grid Trading

Independent checks now include:
- canonical BNB token pair;
- live PancakeSwap V3 pool, tick, liquidity and approximate current pool price context;
- deterministic validation of machine-readable `lowerPrice`, `upperPrice` and `gridCount`;
- whether the checked current price is inside the proposed grid range;
- fee-tier agreement when the agent exposes it.

A coherent grid is not labelled profitable. No orders are placed.

### Rebalancing

Independent checks now include:
- optional wallet native BNB context when a wallet is explicitly supplied;
- supported pair market context;
- deterministic target-allocation validation (0–100% weights, approximately 100% total);
- canonical target asset identity for the configured BNB token map;
- one-way scenario turnover when current allocation percentages are explicitly supplied.

A mathematically coherent target is not labelled economically optimal. No rebalance is executed.

## Machine-readable audition claims

AgentDesk now asks agents to optionally end their audition with an `agentdesk` JSON object. Agents are told to omit or use null for unsupported fields rather than invent data.

Prose-only answers remain usable, but AgentDesk will not infer precise numerical parameters from prose just to create a stronger score.

## AgentDesk Brain

The Brain sits **after** independent verification.

Flow:

```text
live agent audition
→ independent BNB / deterministic category checks
→ immutable verification statuses
→ AgentDesk Brain explanation
```

The Brain can explain:
- verified facts;
- unresolved claims;
- conflicts;
- category-specific watchouts;
- the best next question for the agent.

It cannot change:
- ERC-8004 identity state;
- ERC-8183 job state;
- Task Fit;
- independent verification statuses;
- transaction/deliverable evidence.

## Camber integration

When `CAMBER_BRAIN_ENABLED=true` and a real Camber agent tag/credential/CLI are configured, AgentDesk asks the Camber-backed Brain to explain the already-produced evidence.

If Camber is not configured or is unavailable, AgentDesk uses a deterministic evidence-engine fallback and labels that fallback explicitly. This means the four-category depth flow does not depend on paid AI inference or Camber availability to remain functional.

Source-controlled Camber context lives under:

`camber/agentdesk-brain/`

It contains:
- strict Brain instructions;
- evidence knowledge base;
- structured-output schema;
- Health, Yield, Grid and Rebalance skills.

Creating/syncing the actual Camber account-side agent still requires an authenticated Camber account. The repository cannot truthfully claim that account-side resource exists until it is created/synced there.

## Proof boundary

Category depth is not the Phase 3 paid-job proof gate.

One genuine external ERC-8183 funded/completed job is still required before Issue #5 can be closed. Phase 5 does not fake that transaction and does not require four paid jobs.
