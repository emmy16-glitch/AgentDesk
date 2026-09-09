# AgentDesk Judge Demo

Target: a short, evidence-first demo. Do not narrate features faster than the proof can be inspected.

## 90-second core story

1. **Thesis** — “Don’t trust the profile. Audition the agent.”
2. **Task first** — enter one concrete DeFi task.
3. **Real discovery** — point out the ERC-8004 IDs/source links and explain that registry presence is not liveness.
4. **Blind audition race** — run several candidates. Let timeout/unsupported states remain visible.
5. **Comparison** — show BEST FIT / STRONG FIT / NOT ENOUGH EVIDENCE and the reasons. Emphasize that no global Trust Score exists.
6. **Reveal** — reveal identities only after the evidence has been compared.
7. **Hire proof** — show the audition receipt and provider-signed ERC-8183 terms before any wallet approval. If a genuine live job is available, show its BscScan transaction references.
8. **Delivery proof** — show the exact on-chain job state. Only if COMPLETED, show the verified deliverable hash and optional ERC-8004 completion signal.

## Judge questions to answer directly

**“Are these agents real?”**

Their identities are source-backed BSC ERC-8004 records. AgentDesk separately proves advertised services, live audition responses, and commerce state; it does not collapse those into one “verified” badge.

**“How do you know the comparison was not changed after the fact?”**

The deterministic audition receipt commits to the task, candidate, response/evidence, latency, quote and Task Fit. Paid ERC-8183 terms include that receipt before the provider signs them.

**“What happens when an agent fails?”**

The failure stays visible as unsupported, timeout or error and is not silently replaced with a seed result. Non-completion cannot rank as BEST FIT.

**“What proves a job was actually completed?”**

AgentDesk requires the ERC-8183 state plus provider delivery evidence. Portable completion reputation stays locked unless the signed terms and delivery hash still verify.

## Fallback demo when live upstreams are degraded

Do not switch to fake agents. Show `/proof/`, `/api/health/`, `/api/readiness/`, then demonstrate the truthful failure state and use the recorded successful demo/video for the live journey. Clearly label recorded evidence with its transaction/source references.

## Final recording checklist

Capture desktop and mobile widths, keep the wallet address/transaction references readable, and include the GitHub commit + CI run in the video description. Avoid showing private keys, API keys, seed phrases, or wallet secrets.
