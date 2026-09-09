# Phase 1 — Real BSC candidate audit

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/

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

### DeFiBot.agent — ERC-8004 #172801

Discovery lead:
- a public BNB hackathon marketplace independently reports ERC-8004 token `172801` on BSC mainnet;
- the published agent description is: `Automate grid trading, DCA, and yield compounding across major DEXs while you sleep.`;
- the same source reports an A2A protocol entry and gives a BSC registration transaction/block reference.

Why it is stronger than the earlier generic-trading leads:
- `grid trading` is explicit in the agent description rather than inferred from generic trading capability;
- it also legitimately appears relevant to Yield Optimisation, so it is another many-to-many case.

Phase 1 status:
- external discovery lead: **found**
- Grid Trading text evidence: **strong**
- independent AgentDesk 8004scan lookup: **must be checked**
- direct AgentDesk registry read: **must be checked through `/agents/172801`**
- AgentDesk endpoint probe: **must be run and recorded**
- Phase 2 grid audition: **not started**

### TradePilot.agent — ERC-8004 #177310

Discovery lead:
- publicly listed as a BSC ERC-8004 agent;
- published description says: `Automated crypto trading bot with DCA, grid, and rebalancing strategies.`

Why it is useful:
- explicit `grid` and `rebalancing` language makes it a promising second comparison candidate;
- the word `grid` alone is intentionally weaker evidence than the exact phrase `grid trading`, so AgentDesk should inspect the underlying registration metadata before classifying it automatically.

Phase 1 status:
- external discovery lead: **found**
- Grid Trading text evidence: **promising but needs direct metadata verification**
- direct AgentDesk registry read: **must be checked through `/agents/177310`**
- AgentDesk endpoint probe: **must be run and recorded**
- Phase 2 grid audition: **not started**

### Grid Trading gap status

The category is no longer a zero-candidate discovery gap. We now have at least one strong candidate lead and one promising comparison lead.

It is **not yet operationally closed**. AgentDesk must verify these identities and advertised services through its own Phase 1 pipeline before presenting them as reachable/live candidates. Another marketplace's classification is useful discovery evidence, not AgentDesk's source of truth.

## Why this audit matters

The hackathon requires depth across four categories. The correct response to a category gap is to solve the ecosystem/integration problem, not to invent performance data or rename an unrelated agent.
