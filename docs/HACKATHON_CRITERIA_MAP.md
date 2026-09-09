# Main-Track Criteria Map

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

AgentDesk is built for the BNB Chain **Smart Money Era: Build the Era** main-track brief: a public BNB Agent Studio marketplace where users can discover live BSC agents across four first-class categories, understand them, and activate/hire them with minimal friction.

This file maps implemented product evidence to the three published judging dimensions without inventing a score.

## Functionality

**Published bar:** the journey should work end-to-end from landing to finding, understanding and activating an agent without requiring prior Agent Studio knowledge.

AgentDesk implementation:

- task-first landing rather than protocol-first navigation;
- four clear task families;
- source-backed candidate discovery;
- multi-agent live audition flow;
- transparent Task Fit instead of a global trust percentage;
- exact provider-signed ERC-8183 hire terms before wallet approval;
- buyer-wallet create/register/budget/approve/fund flow;
- provider notification when the advertised service supports it;
- submitted/completed job refresh and delivery verification;
- explicit error, timeout, unsupported and degraded states;
- `/proof`, liveness and readiness routes for judge inspection;
- public production deployment at `https://agentdesk-bnb-eight.vercel.app/`.

**Remaining external gate:** one real buyer-funded external ERC-8183 job must still be completed and preserved as inspectable proof. The code path exists; the repository does not fake the missing paid run.

## Data Quality

**Published bar:** real-time, accurate data should go beyond basic counts and help the buyer make an informed hiring decision.

AgentDesk implementation:

- ERC-8004 source provenance and freshness;
- direct on-chain identity resolution;
- advertised service/protocol evidence;
- live service audition output;
- measured latency and returned quote where supplied;
- raw evidence and checked timestamps;
- deterministic audition receipt hashes;
- category-specific independent BNB context;
- exact unsupported/unverified boundaries;
- signed-term verification before funding;
- on-chain job-state and deliverable-hash verification after funding;
- completion-only portable reputation signal.

AgentDesk explicitly does **not** promote unverifiable APY, future profitability, a profile star count or an LLM explanation into verified truth.

## Agent Diversity

**Published bar:** Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring should all be surfaced with equal depth.

AgentDesk implementation:

| Category | Task input | Audition | Independent depth |
| --- | --- | --- | --- |
| Health Factor Monitoring | wallet/protocol/risk context | same live audition framework | BNB wallet + bounded Venus liquidity/shortfall context |
| Yield Optimisation | asset/scenario amount/risk | same live audition framework | canonical token + PancakeSwap route/pool context; APY boundary |
| Grid Trading | pair/scenario capital/range | same live audition framework | live pool/price/tick + grid/range/fee coherence |
| Rebalancing | portfolio/scenario/objective | same live audition framework | target weights + canonical assets + turnover/sanity math |

All four share the same evidence vocabulary and Brain explanation layer, but none is reduced to a generic form with a renamed heading.

## Judge-safe conclusion

AgentDesk's strongest claim is not that every agent is trustworthy. It is that the marketplace makes **the evidence for a specific hiring decision inspectable**, while keeping missing evidence visibly missing.
