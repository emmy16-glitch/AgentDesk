# Deployment Checklist

- [ ] Clean `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm run contract:compile`
- [ ] `npm run build`
- [ ] Start production server
- [ ] `npm run test:production-smoke`
- [ ] `npm run test:ui`
- [ ] Configure `NEXT_PUBLIC_REOWN_PROJECT_ID`
- [ ] Configure server-only `SCAN8004_API_KEY`
- [ ] Confirm `/api/health/` is 200
- [ ] Confirm `/api/readiness/` is 200 or disclose upstream degradation
- [ ] Confirm `/proof/` loads on desktop and mobile
- [ ] Confirm discovery outage has no seed fallback
- [ ] Confirm timeout candidate shows `NOT ENOUGH EVIDENCE`
- [ ] Record exact deployment Git SHA
- [ ] Record CI run URL
- [ ] Add public deployment URL to submission
- [ ] Preserve one genuine ERC-8183 job/delivery/completion reference before claiming end-to-end completion
