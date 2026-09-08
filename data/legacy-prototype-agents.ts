/**
 * LEGACY PROTOTYPE DATA ONLY.
 *
 * These records powered the first static BSC Testnet UI prototype. Values such
 * as trustScore, activeUsers, uptime, performance and verified are demo values,
 * not current AgentDesk marketplace evidence. Judge-facing discovery must use
 * the ERC-8004/8004scan pipeline instead.
 */
export type LegacyPrototypeAgentIcon = "shield" | "trending-up" | "bar-chart-3" | "pie-chart";

export interface LegacyPrototypeAgent {
  id: string;
  contractId: number;
  name: string;
  category: "Health Factor Monitoring" | "Yield Optimisation" | "Grid Trading" | "Rebalancing";
  description: string;
  icon: LegacyPrototypeAgentIcon;
  color: string;
  trustScore: number;
  price: string;
  capabilities: string[];
  activeUsers: string;
  uptime: string;
  performance: string;
  verified: boolean;
  developer: string;
  network: "BNB Smart Chain Testnet";
}

export const legacyPrototypeAgents: LegacyPrototypeAgent[] = [
  {
    id: "healthguard-ai", contractId: 1, name: "HealthGuard AI", category: "Health Factor Monitoring",
    description: "Monitors DeFi lending positions, tracks health factors, and alerts you before liquidation risk becomes critical.",
    icon: "shield", color: "#a855f7", trustScore: 98, price: "0.0001", activeUsers: "12,430", uptime: "99.8%", performance: "8 months", verified: true,
    capabilities: ["Health factor tracking", "Liquidation alerts", "Lending position monitoring", "Risk analysis"],
    developer: "AgentTrust Labs", network: "BNB Smart Chain Testnet",
  },
  {
    id: "yieldpilot", contractId: 2, name: "YieldPilot", category: "Yield Optimisation",
    description: "Discovers and optimises yield opportunities across BNB Chain with actionable strategy recommendations.",
    icon: "trending-up", color: "#10b981", trustScore: 92, price: "0.0001", activeUsers: "8,210", uptime: "97.2%", performance: "6 months", verified: true,
    capabilities: ["APR comparison", "Yield discovery", "Strategy recommendations", "Capital optimization"],
    developer: "Yield Labs", network: "BNB Smart Chain Testnet",
  },
  {
    id: "gridmaster", contractId: 3, name: "GridMaster", category: "Grid Trading",
    description: "Executes automated grid trading strategies with market analysis and continuous strategy monitoring.",
    icon: "bar-chart-3", color: "#3b82f6", trustScore: 92, price: "0.0001", activeUsers: "6,980", uptime: "96.5%", performance: "4 months", verified: true,
    capabilities: ["Trading range setup", "Market analysis", "Automated execution", "Strategy monitoring"],
    developer: "Grid Systems", network: "BNB Smart Chain Testnet",
  },
  {
    id: "rebalanceguard", contractId: 4, name: "RebalanceGuard", category: "Rebalancing",
    description: "Maintains portfolio allocation targets with position optimisation and timely rebalancing suggestions.",
    icon: "pie-chart", color: "#f59e0b", trustScore: 95, price: "0.0001", activeUsers: "7,340", uptime: "98.1%", performance: "5 months", verified: true,
    capabilities: ["Portfolio balancing", "Asset allocation", "Position optimization", "Rebalancing suggestions"],
    developer: "Balance Protocol", network: "BNB Smart Chain Testnet",
  },
];

export function getLegacyPrototypeAgent(id: string) {
  return legacyPrototypeAgents.find((agent) => agent.id === id);
}
