export interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  trustScore: number;
  users: string;
  performance: string;
  uptime: string;
  price: string;
  capabilities: string[];
  verified: boolean;
  icon: string; // emoji/icon identifier
  color: string;
}

export const agents: Agent[] = [
  {
    id: "guardian-ai",
    name: "Guardian AI",
    category: "Security & Monitoring",
    description:
      "Monitors your DeFi positions, detects risks, and alerts you in real-time for liquidation protection.",
    trustScore: 98,
    users: "12,430",
    performance: "99.8%",
    uptime: "8 months",
    price: "0.0001 BNB",
    capabilities: [
      "Wallet monitoring",
      "Risk detection",
      "Liquidation alerts",
    ],
    verified: true,
    icon: "shield",
    color: "#a855f7",
  },
  {
    id: "yieldpilot",
    name: "YieldPilot",
    category: "Yield Optimization",
    description:
      "Finds the best DeFi yields on BNB Chain and automatically moves your capital to maximize returns.",
    trustScore: 92,
    users: "8,210",
    performance: "97.2%",
    uptime: "6 months",
    price: "0.0001 BNB",
    capabilities: [
      "Yield strategies",
      "Pool analysis",
      "Auto rebalancing",
    ],
    verified: true,
    icon: "trending-up",
    color: "#10b981",
  },
  {
    id: "gridmaster",
    name: "GridMaster",
    category: "Grid Trading",
    description:
      "Executes grid trading strategies for volatile markets with automated order placement and tracking.",
    trustScore: 92,
    users: "6,980",
    performance: "96.5%",
    uptime: "4 months",
    price: "0.0001 BNB",
    capabilities: [
      "Grid strategy setup",
      "Market condition analysis",
      "Automated execution",
    ],
    verified: true,
    icon: "bar-chart-3",
    color: "#3b82f6",
  },
  {
    id: "risklens",
    name: "RiskLens",
    category: "Portfolio Analysis",
    description:
      "Analyzes your portfolio risk and provides actionable insights for safer investments.",
    trustScore: 95,
    users: "7,340",
    performance: "98.1%",
    uptime: "5 months",
    price: "0.0001 BNB",
    capabilities: [
      "Portfolio risk scoring",
      "Asset correlation analysis",
      "Rebalancing suggestions",
    ],
    verified: true,
    icon: "pie-chart",
    color: "#f59e0b",
  },
];

export const categories = [
  "All Categories",
  "Monitoring Agents",
  "Grid Trading Agents",
  "Health Factor Agents",
  "Yield Agents",
];
