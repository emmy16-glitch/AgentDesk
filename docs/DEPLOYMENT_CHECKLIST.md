# Deployment Checklist

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/

Public production deployment is now live on Vercel. This checklist remains useful for repeat verification and future releases.

- [ ] Clean `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run contract:compile`
- [ ] `npm run build`
- [ ] Start production server
- [ ] `npm run test:production-smoke`
- [ ] `npm run test:ui`
- [ ] Configure `NEXT_PUBLIC_REOWN_PROJECT_ID`
- [ ] Configure server-only `SCAN8004_API_KEY`
- [x] Public deployment created
- [x] Public URL recorded: `https://agentdesk-bnb-eight.vercel.app/`
- [x] Production `/` verified reachable
- [x] Production `/docs/` verified reachable
- [x] Production `/api/readiness/` verified during release checks
- [ ] Confirm `/api/health/` is 200 before each judge/demo session
- [ ] Confirm `/api/readiness/` is 200 or disclose upstream degradation
- [ ] Confirm `/proof/` loads on desktop and mobile
- [ ] Confirm discovery outage has no seed fallback
- [ ] Confirm timeout candidate shows `NOT ENOUGH EVIDENCE`
- [ ] Record exact deployment Git SHA for the final evidence bundle
- [ ] Record CI run URL
- [x] Add public deployment URL to submission documentation
- [ ] Preserve one genuine ERC-8183 job/delivery/completion reference before claiming end-to-end paid-job completion

The final item is intentionally separate from deployment readiness. A live application and a completed external paid ERC-8183 job are different proof states.
