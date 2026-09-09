# Final Submission Checklist

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/  
**Proof page:** https://agentdesk-bnb-eight.vercel.app/proof/

This checklist separates work that is already complete in the repository from the few actions that still depend on a real wallet, an external provider, or final submission media.

## Repository-complete

- [x] All four official marketplace categories are first-class.
- [x] Source-backed BSC/ERC-8004 discovery; no fake fallback catalogue.
- [x] On-chain identity and metadata resolution kept separate from source listing.
- [x] Multi-agent live audition flow with real timing/evidence states.
- [x] Task Fit uses evidence instead of a fabricated global trust score.
- [x] Category-specific no-funds independent checks for Health, Yield, Grid and Rebalancing.
- [x] Scenario capital is clearly distinguished from real wallet balances.
- [x] AgentDesk Brain distinguishes verified facts, unresolved claims and conflicts.
- [x] Deterministic Brain fallback prevents Camber outages from creating a dead end.
- [x] ERC-8183 provider-signed negotiation and buyer-wallet funding implementation.
- [x] Audition receipt anchored in the provider-signed task before hire.
- [x] On-chain delivery/job refresh and deliverable-hash verification implementation.
- [x] Completion-only ERC-8004 reputation signal.
- [x] Security headers, liveness, BNB readiness, manifest and global error boundary.
- [x] Judge-facing `/proof` route.
- [x] Production build, smoke tests, responsive browser QA and CI.
- [x] Patched maintained Next.js line; no known critical runtime advisory accepted by CI.
- [x] Dependabot configured for ongoing npm and GitHub Actions maintenance.
- [x] Public Vercel deployment is live.
- [x] Live URL is documented throughout the repository.

## Public deployment — complete

Production URL:

https://agentdesk-bnb-eight.vercel.app/

Judge-facing routes:

- Marketplace: https://agentdesk-bnb-eight.vercel.app/
- Docs: https://agentdesk-bnb-eight.vercel.app/docs/
- Proof: https://agentdesk-bnb-eight.vercel.app/proof/
- Health: https://agentdesk-bnb-eight.vercel.app/api/health/
- Readiness: https://agentdesk-bnb-eight.vercel.app/api/readiness/

Before a live judge session, re-check health/readiness and disclose any truthful upstream degradation instead of hiding it.

**Do not paste Camber API keys, wallet private keys, deployer private keys, seed phrases, or protected provider credentials into GitHub, screenshots, issue comments, or the submission form.**

## Requires a real wallet / external provider

### Final ERC-8183 live completion proof — Issue #5

- [ ] Connect the buyer wallet.
- [ ] Use one genuine external ERC-8183-compatible provider.
- [ ] Verify the current provider-signed quote and exact payment token before approving.
- [ ] Fund only the small real job the user has chosen.
- [ ] Wait for the external provider to perform the task.
- [ ] Verify submitted delivery evidence and on-chain deliverable commitment.
- [ ] Show the independently inspectable job/transaction reference.
- [ ] Only call the flow completed if the actual ERC-8183 state is COMPLETED.
- [ ] Close Issue #5 only after all of the above are evidenced.

This gate needs only **one** genuine small job. It does not require paying four category agents.

## Demo video / public post

A real production recording has been captured from the public AgentDesk deployment. The current Grid Trading recording shows a **LIVE CAPABILITY MATCH** and the transition to Hire.

That recording must continue to be described truthfully:

```text
Live capability confirmed
≠ task completed
≠ trade executed
≠ money moved
≠ paid ERC-8183 job completed
```

Remaining media tasks:

- [ ] Publish the final video/X post.
- [ ] Add the public video/post URL to the hackathon submission if editing is still available.
- [ ] Keep captions/post copy consistent with the capability-confirmed truth state.

## Final hackathon form

- [x] Project name: **AgentDesk**
- [x] Main public app exists.
- [x] GitHub repository is public and documented.
- [ ] Confirm the final form response contains or can reach the live app URL.
- [ ] Add demo video/post URL if the form allows an update.
- [x] Description starts with the task-first audition differentiator.
- [x] Four-category depth is explicitly documented.
- [x] ERC-8004 and ERC-8183 usage is explicitly documented.
- [ ] Do not claim Altana partner eligibility without its required live Altana on-chain evidence.
- [ ] Do not claim TermiX partner eligibility without the required Agent Advantage Report.
- [ ] Do not describe historical `AgentTrustMarketplace.sol` activity as the current ERC-8183 proof.

## Final truth check

Before submission, search the project copy/video/text for these dangerous conflations:

```text
registry listed = verified agent
advertised = reachable
reachable = audition passed
audition passed = hired
capability confirmed = task completed
funded = completed
Brain analysis = blockchain proof
prototype activation = ERC-8183 job
```

None of those equations should appear as a product claim.
