import { Hexagon, ChevronDown, Wallet } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 shadow-[0_0_15px_rgba(242,189,62,0.1)]">
            <Hexagon className="h-5 w-5 text-gold" strokeWidth={2} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Agent<span className="text-gold">Trust</span>
          </span>
        </a>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          {["Marketplace", "Explore", "How it works", "Docs"].map((item, i) => (
            <a
              key={item}
              href="#"
              className={`text-sm font-medium transition-colors duration-200 relative ${
                i === 0 ? "text-white" : "text-text-secondary hover:text-white"
              }`}
            >
              {item}
              {i === 0 && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold rounded-full" />
              )}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-white hover:border-white/[0.15] transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            BSC Testnet
            <ChevronDown className="h-3 w-3" />
          </button>
          <button className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-surface px-3.5 py-2 text-xs font-medium text-text-secondary hover:text-white hover:border-white/[0.15] transition-colors">
            <Wallet className="h-3.5 w-3.5 text-gold" />
            <span>0x8a3...91c2</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </nav>
  );
}
