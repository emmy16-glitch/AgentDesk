# Final Judge Demo Runbook

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

Target length: **3–5 minutes**.

The goal is to make the judge understand AgentDesk in the first 20 seconds, then prove the differentiator with the smallest number of clicks.

## 0:00–0:20 — thesis

Open the deployed home page:

https://agentdesk-bnb-eight.vercel.app/

Say:

> AgentDesk is the BNB marketplace where agents prove they are right for your exact task before you hire them. Instead of trusting a profile or a global score, you audition several live ERC-8004 agents on the same task and compare fresh evidence.

Point to:

- **Don't trust the listing. Test the agent.**
- the four task families.

## 0:20–0:50 — all four categories are first-class

Move briefly through:

1. Health Factor Monitoring
2. Yield Optimisation
3. Grid Trading
4. Rebalancing

Do not spend the demo on four separate executions. The purpose here is to show that each has a genuinely different task form and independent-check contract rather than four labels on one generic flow.

Say:

> Category depth does not require the user to fund four agents. Health uses read-only Venus context, Yield checks token/pool context, Grid checks the live pool and proposed range, and Rebalancing checks allocation and turnover math. Scenario capital is hypothetical and never presented as a wallet balance.

## 0:50–1:45 — live audition race

Pick a category with at least two currently reachable source-qualified candidates.

1. Select two candidates.
2. Run **live auditions**.
3. Keep identities blind while the race runs.
4. Show the independent lane states.
5. When complete, show:
   - Candidate A/B;
   - Task Fit;
   - measured latency;
   - quote if returned;
   - evidence count/source;
   - missing evidence.

Say:

> Both candidates received the same bounded task. AgentDesk ranks only the evidence actually returned. A timeout remains visible and cannot outrank a completed audition.

Do not describe a quote as payment and do not describe a completed audition as a completed job.

## 1:45–2:30 — independent BNB check + Brain

Run **depth checks + Brain** on one audition.

Use the category-specific evidence panel to show at least one reproducible fact and one unresolved boundary where possible.

Good Yield example:

> AgentDesk can prove this token and pool context from BNB Chain, but it cannot reproduce the claimed APY, so the APY remains unverified.

Then show AgentDesk Brain.

Say:

> The Brain explains the proof. It cannot create it. If Camber is available, the Camber AgentDesk Brain explains the already-verified evidence. If not, AgentDesk falls back to a deterministic evidence engine rather than inventing an answer.

If Camber is being shown separately, use the configured AgentDesk Brain and show its proof-boundary response, but do not imply the Camber agent is itself an ERC-8004 marketplace seller.

## 2:30–3:15 — reveal + hire terms

Reveal the leading candidate.

Enter the ERC-8183 hire flow far enough to show:

- exact selected ERC-8004 identity/wallet binding;
- current provider-signed terms;
- chain;
- payment token;
- quoted amount;
- signature verification;
- audition receipt binding;
- the wallet transactions that would create/register/budget/approve/fund the real job.

Say:

> AgentDesk does not turn the audition into an invisible payment. Before the buyer funds anything, the provider's terms are authenticated and tied back to the exact audition and ERC-8004 wallet.

If you do not have a real funded job in this demo, stop before pretending one exists.

## 3:15–3:50 — proof map

Open:

https://agentdesk-bnb-eight.vercel.app/proof/

Walk through the evidence ladder:

```text
registry listed
→ identity/service resolved
→ audition completed
→ independent context checked
→ signed hire terms verified
→ funded
→ submitted
→ completed
```

Say:

> Each later state requires its own evidence. AgentDesk never labels FUNDED as completed work and never uses a generic verified-agent badge to hide those distinctions.

Open `/api/health/` and `/api/readiness/` only if time permits.

## Optional 3:50–4:30 — real paid ERC-8183 proof

Only use this segment after Issue #5 is genuinely satisfied.

Show:

- real job ID;
- funding transaction/BscScan reference;
- external provider submission;
- independently reproduced deliverable hash;
- actual ERC-8183 COMPLETED state if reached.

Say exactly what the state proves. Do not auto-settle just to make the video look complete.

## Closing line

> AgentDesk turns agent discovery into evidence-based hiring: discover the agent, audition it, independently check what can be checked, understand what is still unresolved, and only then hire it on BNB Chain.

## Demo failure plan

Live agent infrastructure can fail during judging. Never replace a failed call with fake success data.

If live discovery fails:
- show the truthful discovery-unavailable state;
- refresh once;
- use the Phase 2 audit or recorded demo as historical live evidence if necessary.

If one audition times out:
- keep it visible;
- use the other candidate if it completed;
- point out that a timeout cannot win.

If Camber is unavailable:
- show the deterministic Brain fallback;
- explain that proof state comes from AgentDesk checks, not the LLM provider.

If BNB RPC is degraded:
- show `/api/readiness/` returning its truthful degraded state;
- do not describe stale data as live.
