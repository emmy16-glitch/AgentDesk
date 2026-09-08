# Phase 1 — Real BSC candidate audit

Snapshot date: 2026-09-08

Purpose: record manually verified candidate examples while the live discovery pipeline is being built. This file is an audit notebook, **not** a hard-coded production catalogue. The marketplace must continue to source candidates dynamically.

## Acceptance rule

A candidate is only useful for AgentDesk when we can distinguish:

1. ERC-8004 identity exists on BNB Smart Chain mainnet;
2. its own published/indexed metadata supports one or more required categories;
3. advertised service metadata can be resolved;
4. at least one useful service endpoint can be reached;
5. in Phase 2, it can pass the relevant task-specific audition.

This audit currently proves only the levels explicitly written below.

## Health Factor Monitoring

### Venus powered by HeyAnon — ERC-8004 #43129

Source:
https://8004scan.io/agents/bsc/43129

Why it is a strong candidate:
- registered on BNB Smart Chain;
- explicitly describes itself as an execution layer for Venus lending;
- published description covers collateral ratios, borrow limits, borrow/repay, supply/redeem, collateral management, APR queries and balance checks;
- 8004scan shows an MCP endpoint associated with Venus.

Current classification evidence:
- `lending`
- `collateral`
- `borrow`
- `venus`

Phase 1 status:
- registry/index evidence: **found**
- category evidence: **strong**
- direct AgentDesk registry read: **must be checked through `/agents/43129`**
- AgentDesk endpoint probe: **must be run and recorded**
- Phase 2 health audition: **not started**

## Yield Optimisation

### DeFiMatrix.agent — ERC-8004 #171927

Source:
https://8004scan.io/agents/bsc/171927

Why it is a strong candidate:
- registered on BNB Smart Chain;
- explicitly says it provides personalized yield strategies based on real-time DeFi market data;
- its published description also explicitly includes portfolio rebalancing, making it a legitimate multi-category candidate rather than forcing it into one bucket.

Current classification evidence:
- `yield`
- `rebalancing`
- portfolio-management related tags published by the source

Phase 1 status:
- registry/index evidence: **found**
- Yield category evidence: **strong**
- Rebalancing category evidence: **strong**
- direct AgentDesk registry read: **must be checked through `/agents/171927`**
- AgentDesk endpoint probe: **must be run and recorded**
- Phase 2 auditions: **not started**

### DeFi Trading Agent SperaxOS — ERC-8004 #6441

Source:
https://8004scan.io/agents/bsc/6441

Why it is useful:
- registered on BNB Smart Chain;
- explicitly describes automated DeFi yield optimisation;
- mentions liquidity-pool monitoring, swaps, yield-farming position management and real-time market analysis.

Current classification evidence:
- `yield`
- `liquidity`
- `farm`

Phase 1 status:
- registry/index evidence: **found**
- category evidence: **strong**
- direct AgentDesk registry read: **must be checked through `/agents/6441`**
- AgentDesk endpoint probe: **must be run and recorded**
- Phase 2 yield audition: **not started**

## Rebalancing

### DeFiMatrix.agent — ERC-8004 #171927

The same real identity qualifies independently for Rebalancing because its own description explicitly advertises portfolio rebalancing. AgentDesk therefore treats category membership as many-to-many.

Phase 1 status:
- source category evidence: **strong**
- no separate rebalancing-only candidate is required merely to make the UI look diverse; however, Phase 1 should continue discovering additional candidates for meaningful comparison.

## Grid Trading

### Current result: unresolved real-candidate gap

As of this audit, manual searches have found BSC autonomous trading agents, but no candidate has yet been verified whose own BSC ERC-8004 metadata clearly advertises **grid trading / grid strategy** strongly enough to satisfy AgentDesk's category-evidence rule.

Examples of generic trading agents are not automatically classified as Grid Trading.

This is deliberate. AgentDesk must show an empty/insufficient category rather than relabel a generic trading bot to satisfy the four-card layout.

Next actions:
1. use the live 8004scan semantic API with grid-specific queries;
2. inspect matching ERC-8004 registration metadata and service definitions;
3. probe qualifying BSC endpoints;
4. if the ecosystem truly has no usable BSC Grid Trading agent, evaluate building/registering one as a separate agent project rather than fabricating marketplace inventory.

## Why this audit matters

The hackathon requires depth across four categories. The correct response to a category gap is to solve the ecosystem/integration problem, not to invent performance data or rename an unrelated agent.
