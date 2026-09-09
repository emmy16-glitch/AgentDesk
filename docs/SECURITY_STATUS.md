# Dependency Security Status

**Live AgentDesk:** https://agentdesk-bnb-eight.vercel.app/  
**Live docs:** https://agentdesk-bnb-eight.vercel.app/docs/

Checked during final hackathon hardening on 2026-09-09.

## Completed

- Next.js upgraded from 15.3.3 to the patched maintained 15.5.24 line.
- The previously reported critical npm advisory count was reduced to **zero**.
- Safe non-breaking transitive `npm audit fix` changes were applied.
- GitHub Actions checkout/setup-node moved from v4 to v5.
- CI now runs `npm audit --omit=dev --audit-level=critical` before the build and fails if a critical runtime advisory is introduced.
- Dependabot is enabled for npm and GitHub Actions maintenance.
- The production application is publicly available at `https://agentdesk-bnb-eight.vercel.app/`.

## Remaining inherited advisories

After the safe fixes, npm still reported **5 runtime advisories: 3 moderate and 2 high**.

The remaining high-level dependency paths reported by npm are inherited through:

1. `wagmi` → `@base-org/account` → `@coinbase/cdp-sdk` → `axios`;
2. Next.js 15.x → its nested PostCSS dependency.

The development-only Solidity compiler path also reports `tmp` advisories in the full audit, but that package is not part of the production-only audit.

## Why `npm audit --force` was not applied

The force remediation proposed breaking dependency changes, including a Next.js 16 migration and an incompatible Solidity compiler downgrade. Applying those automatically immediately before judging would trade known, documented inherited advisories for unreviewed application and smart-contract regressions.

AgentDesk therefore:

- removed the critical advisory;
- applied all safe non-breaking fixes available in the current dependency graph;
- gates future **critical runtime** advisories in CI;
- keeps the remaining inherited high/moderate advisories explicit;
- leaves major framework/dependency migration for a dedicated post-hackathon regression pass.

This document is not a claim that the dependency tree is vulnerability-free.
