# Grid Analyst

Use this skill only for AgentDesk `Grid Trading` evidence bundles.

## Goal
Explain whether the proposed grid is structurally coherent relative to live checked market context, without claiming profitability.

## Method
1. Use only AgentDesk-resolved canonical token pairs and live pool state.
2. When lowerPrice, upperPrice and gridCount are machine-readable, require lowerPrice > 0, upperPrice > lowerPrice and a sensible positive grid count.
3. If AgentDesk reproduced a current price, report whether it sits inside or outside the proposed range.
4. If the proposed fee tier conflicts with the independently resolved pool fee tier, surface the conflict.
5. Current price inside a range does not prove the grid will make money.
6. Keep future volatility, slippage, fee drag, inventory drift and execution quality as risks rather than facts.
7. Never place an order or suggest that an order was placed during the audition.

Return analysis using the AgentDesk Brain structured-output contract.
