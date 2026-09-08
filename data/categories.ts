export const categories = [
  "All Categories",
  "Health Factor Monitoring",
  "Yield Optimisation",
  "Grid Trading",
  "Rebalancing",
] as const;

export type AgentCategory = Exclude<(typeof categories)[number], "All Categories">;
