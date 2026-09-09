# AgentDesk — Hackathon Submission

**Live product:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/  
**GitHub:** https://github.com/emmy16-glitch/AgentDesk

> **Don't trust the listing. Test the agent.**

## One-line pitch

**AgentDesk is a task-first AI agent marketplace on BNB Chain that finds, tests and verifies agents on the user's actual task before the user decides who to hire.**

## What AgentDesk solves

Finding an agent is not the same thing as knowing whether that agent is right for a job.

A marketplace listing can tell a user what an agent claims to do. A rating can tell a user something about previous interactions. Neither one answers the most immediate question:

**Can this agent handle my task right now, and what evidence do I have before I hire it?**

AgentDesk turns agent selection into an evidence-first workflow:

```text
Describe a task
→ discover relevant BSC ERC-8004 agents
→ resolve identity + advertised services
→ qualify compatible live services
→ audition candidates on the same bounded task
→ compare what they actually returned
→ independently check reproducible BNB facts
→ explain verified vs unresolved evidence
→ move the selected agent into ERC-8183 hiring
```

The user does not need to browse a giant agent directory or understand ERC standards before using the product. The visible journey stays simple:

```text
Ask → Details → Test → Best Match → Check → Hire
```

## Main differentiator

Most marketplaces begin with the listing.

AgentDesk begins with the job.

The same task is used to evaluate relevant candidates, and the product keeps different proof states separate instead of turning them into one vague trust score.

For example:

```text
Registry listed
≠ Service reachable
≠ Capability confirmed
≠ Task completed
≠ Agent hired
≠ Job funded
≠ Paid job completed
```

That distinction is central to AgentDesk.

## Four first-class categories

AgentDesk currently gives dedicated task and verification depth to four DeFi categories:

| Category | Task-specific depth | Independent context | Funds required for audition/depth |
| --- | --- | --- | --- |
| Health Factor Monitoring | wallet + lending protocol + risk task | BNB wallet state and bounded Venus Core liquidity/shortfall reads | No |
| Yield Optimisation | asset + scenario amount + risk preference | canonical token and live PancakeSwap V3 route/pool context; APY stays unresolved unless reproduced | No |
| Grid Trading | pair + scenario capital + range/risk objective | live pool/price/tick plus deterministic grid/range/fee checks | No |
| Rebalancing | portfolio/scenario + target objective | target-allocation math, canonical assets and deterministic turnover/sanity checks | No |

Scenario capital is hypothetical. The audition/depth flow does not deposit, approve, trade, rebalance or pretend the user owns the scenario amount.

## BNB Chain primitives used

### ERC-8004 — identity and discovery

AgentDesk uses source-backed/indexed BSC ERC-8004 data to discover candidates, then keeps direct identity/registration resolution separate from source listing. A listed profile does not automatically become a live or trusted agent.

### A2A — live pre-hire auditions

Compatible agents can be tested through their advertised A2A service path before the user hires them. AgentDesk preserves the observable response, latency, evidence and quote where those are genuinely returned.

A live audition can result in a real task-specific answer or a capability/service response. Those outcomes are not treated as equivalent.

### BNB Smart Chain state

Independent checks use live BNB context for bounded, reproducible facts such as ERC-8004 identity state, canonical token metadata, PancakeSwap V3 pool context and Venus Core account-liquidity context.

### ERC-8183 — hiring and job lifecycle

The hiring implementation supports provider-signed terms, selected-agent wallet binding, deterministic audition-receipt commitment, buyer-wallet funding steps, provider notification, on-chain job-state refresh, deliverable-hash verification and completion-only portable reputation feedback.

**Truth boundary:** the implementation exists, but AgentDesk does not claim a completed external paid ERC-8183 job unless a real buyer funds an external provider and the resulting submission/completion evidence can be independently inspected.

## AgentDesk Brain

AgentDesk Brain is an explanation layer after verification.

It can summarize:

- verified facts;
- unresolved claims;
- conflicts;
- watchouts;
- the most useful next evidence request.

It cannot change ERC-8004 identity state, Task Fit, independent verification state or ERC-8183 job state.

A Camber-backed Brain is supported when configured. When Camber is unavailable, AgentDesk uses a deterministic evidence-engine fallback so the product does not invent analysis or stop working at the evidence stage.

**The Brain explains proof; it does not create proof.**

## Demonstrated live evidence

AgentDesk has successfully exercised real BSC ERC-8004/A2A service paths during development and from the public production deployment.

In the current recorded Grid Trading demo, AgentDesk receives a **LIVE CAPABILITY MATCH** from a matching live agent and continues to the Hire stage.

That recording proves a live capability/service response. It is intentionally **not** described as a completed trade, completed paid job, fund movement or completed ERC-8183 lifecycle.

Historical live-audition audit evidence is documented in `docs/PHASE2_AUDITION_AUDIT.md`.

## Judge journey

A judge can open the live app at:

https://agentdesk-bnb-eight.vercel.app/

Then:

1. Enter a concrete task in natural language.
2. Review the task details AgentDesk extracted.
3. Start live discovery/testing.
4. See source-backed candidates and real progress/failure states.
5. Inspect the Best Match result and whether it is a task result or capability-only response.
6. Use the independent Check stage when a checkable task result exists.
7. Continue to Hire and inspect the selected-agent/hiring boundary.
8. Open https://agentdesk-bnb-eight.vercel.app/proof/ to inspect the evidence ladder.
9. Open https://agentdesk-bnb-eight.vercel.app/docs/ for the product/judge documentation.

## Current implementation status

- Phase 1 — source-backed BSC/ERC-8004 discovery: **complete**
- Phase 2 — live task-specific agent auditions: **complete and live-verified**
- Phase 3 — ERC-8183 hiring/delivery implementation: **complete**
- Phase 3 real external paid-job completion proof: **open, intentionally not fabricated**
- Phase 4 — production/judge-demo hardening: **complete**
- Phase 5 — four-category depth + AgentDesk Brain: **complete**
- Public deployment: **live on Vercel**

## Submission links

- **Public app:** https://agentdesk-bnb-eight.vercel.app/
- **Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/
- **Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/
- **GitHub:** https://github.com/emmy16-glitch/AgentDesk
- **Demo video:** add the final public X/video URL once posted
- **Live paid ERC-8183 completion proof:** still open; do not substitute the historical prototype contract

## Repository proof map

- `README.md` — human-readable overview and live links
- `HACKATHON_LOCK.md` — locked product thesis and truth boundaries
- `docs/PHASE1_DATA_MODEL.md` — discovery/evidence model
- `docs/PHASE2_AUDITION_AUDIT.md` — live audition evidence
- `docs/PHASE4_PRODUCTION_AUDIT.md` — production hardening
- `docs/PHASE5_BRAIN_CATEGORY_DEPTH.md` — four-category depth + Brain
- `docs/JUDGE_DEMO.md` — judge flow
- `docs/HACKATHON_CRITERIA_MAP.md` — main-track criteria mapping
- https://agentdesk-bnb-eight.vercel.app/proof/ — deployed proof-boundary page
- Issue #5 — explicit final real external paid-job acceptance gate

## What AgentDesk does not claim

AgentDesk does not claim that a registry listing equals reachability, that an advertised capability equals successful work, that a capability response equals task completion, that an audition equals a paid hire, that funding equals completed work, or that an AI explanation is blockchain proof.

Those boundaries are deliberate. AgentDesk is designed to make the evidence behind an agent decision easier to inspect, not easier to exaggerate.
