# Final Submission Checklist

This checklist separates work that is already complete in the repository from the few actions that require an authenticated account, a public host, or real funds.

## Repository-complete

- [x] All four official marketplace categories are first-class.
- [x] Source-backed BSC/ERC-8004 discovery; no fake fallback catalogue.
- [x] On-chain identity and metadata resolution kept separate from source listing.
- [x] Multi-agent live audition flow with blind comparison and real timing/evidence states.
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
- [x] AgentDesk Brain created and successfully tested in the owner's Camber account.

## Requires the user's authenticated hosting account

### Public deployment — required by the main track

- [ ] Import `emmy16-glitch/AgentDesk` into Vercel (or another Node-compatible public host).
- [ ] Confirm the production branch is `main`.
- [ ] Add `NEXT_PUBLIC_REOWN_PROJECT_ID` for wallet connection.
- [ ] Add `SCAN8004_API_KEY` if available; anonymous discovery remains a lower-rate fallback.
- [ ] Optionally set `BSC_MAINNET_RPC_URL` to a reliable BSC mainnet RPC.
- [ ] Keep `CAMBER_BRAIN_ENABLED=false` on a host that does not provide the Camber CLI; the deterministic Brain remains functional.
- [ ] If using a server/container where Camber CLI is installed, add `CAMBER_API_KEY`, `CAMBER_BRAIN_AGENT_TAG=@emmanuel.Agentdesk-brain`, and enable the Brain.
- [ ] Open `/api/health` and confirm HTTP 200.
- [ ] Open `/api/readiness` and confirm BNB readiness is 200 (or investigate a truthful 503).
- [ ] Open `/proof` and verify the production commit is visible when the host exposes it.
- [ ] Put the final public URL into `SUBMISSION.md` / the hackathon form.

**Do not paste Camber API keys, wallet private keys or deployer private keys into GitHub, screenshots, issue comments, or the submission form.**

## Requires a real wallet / external provider

### Final ERC-8183 live proof — Issue #5

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

## Demo video — manual recording

- [ ] Record a 3–5 minute walkthrough using `docs/FINAL_DEMO_RUNBOOK.md`.
- [ ] Show the public URL in the browser address bar at least once.
- [ ] Show all four categories, not only the strongest one.
- [ ] Run a live audition when the external service is available.
- [ ] Show an independent category check and AgentDesk Brain.
- [ ] Show `/proof` and explain the evidence ladder.
- [ ] If the real paid job proof exists, show its BscScan/protocol references.
- [ ] If it does not exist yet, do not stage or fake it in the video.
- [ ] Upload the video and put the real link in the submission form.

## Final hackathon form

- [ ] Project name: **AgentDesk**
- [ ] Tagline: **Don't trust the profile. Audition the agent.**
- [ ] Main track: BNB Agent Studio Marketplace.
- [ ] Public deployment URL entered.
- [ ] GitHub URL entered.
- [ ] Demo video URL entered.
- [ ] Description starts with the task-first audition differentiator.
- [ ] Four-category depth is explicitly stated.
- [ ] ERC-8004 and ERC-8183 usage is explicitly stated.
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
funded = completed
Brain analysis = blockchain proof
prototype activation = ERC-8183 job
```

None of those equations should appear as a product claim.
