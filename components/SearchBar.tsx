import { Search, Filter, ChevronDown } from "lucide-react";
import { categories } from "@/data/agents";

export default function SearchBar({ activeCategory, setActiveCategory }: { activeCategory: string; setActiveCategory: (c: string) => void }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search agents (e.g. yield, trading, monitoring...)"
            className="w-full rounded-xl border border-white/[0.08] bg-card/60 pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-card/60 px-4 py-3.5 text-sm font-medium text-text-secondary hover:text-white hover:border-white/[0.15] transition-colors w-fit">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat
                ? "bg-gold text-black shadow-[0_4px_20px_rgba(242,189,62,0.25)]"
                : "bg-card/60 text-text-secondary border border-white/[0.06] hover:text-white hover:border-white/[0.12]"
            }`}
          >
            {cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
          <span>Sort by</span>
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-card/40 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-white transition-colors">
            Most Trusted
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
