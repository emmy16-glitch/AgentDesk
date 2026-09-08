import { Database, Grid2X2, SearchCheck, ShieldCheck } from "lucide-react";

export default function StatsSection() {
  const stats = [
    { icon: ShieldCheck, value: "ERC-8004", text: "Identity Source", sub: "BSC registry-backed" },
    { icon: Grid2X2, value: "4", text: "Required Categories", sub: "Health · Yield · Grid · Rebalancing" },
    { icon: Database, value: "Chain 56", text: "Discovery Network", sub: "BNB Smart Chain mainnet" },
    { icon: SearchCheck, value: "Evidence-first", text: "Marketplace Rule", sub: "No fabricated performance stats" },
  ];

  return <footer className="stats-footer" id="how-it-works"><div className="stat-list">{stats.map(({ icon: Icon, value, text, sub }) => <div className="stat" key={value}><Icon /><p><b>{value}</b><span>{text}</span>{sub && <small>{sub}</small>}</p></div>)}</div><div className="future"><a href="#agents" className="gold-button">Explore the registry&nbsp; →</a><span>Discover → audition → compare → hire</span></div></footer>;
}
