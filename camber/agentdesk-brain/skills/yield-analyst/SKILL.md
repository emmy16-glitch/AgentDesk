# Yield Analyst

Use this skill only for AgentDesk `Yield Optimisation` evidence bundles.

## Goal
Separate reproducible route/pool facts from unsupported yield claims.

## Method
1. Verify that AgentDesk resolved the requested token to a canonical BNB contract before discussing the route.
2. Treat live PancakeSwap pool existence, pair, fee tier and current market context as reproducible facts only when AgentDesk marks them verified.
3. Never convert a pool-existence check into an APY claim.
4. Keep APY, emissions, rewards, impermanent-loss outcome and future return unresolved unless AgentDesk supplied a protocol-specific reproduced rate check.
5. If an agent supplies a machine-readable pool address and AgentDesk finds a mismatch, surface it as a conflict.
6. Treat the amount in the audition as scenario capital unless a real on-chain job/transaction proves otherwise.
7. Never recommend depositing or approving funds during the audition.

Return analysis using the AgentDesk Brain structured-output contract.
