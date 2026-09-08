import { Wallet, ExternalLink, ChevronDown } from "lucide-react";

export default function WalletPanel() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-md overflow-hidden mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gold/10 border border-gold/10 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-gold" />
          </div>
          <h2 className="text-sm font-bold text-white">Your Wallet</h2>
        </div>

        <div className="rounded-xl bg-surface/60 border border-white/[0.06] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted font-medium">Network</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[10px] font-bold text-success">
              <span className="h-1 w-1 rounded-full bg-success" />
              BSC Testnet
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Balance</span>
            <span className="text-sm font-extrabold text-white">0.4823 tBNB</span>
          </div>
        </div>

        <a
          href="#"
          className="block w-full rounded-xl bg-gold text-center px-4 py-3 text-sm font-extrabold text-black hover:bg-gold-dark transition-colors shadow-[0_4px_20px_rgba(242,189,62,0.2)] mb-3"
        >
          Disconnect Wallet
        </a>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Connected via MetaMask</span>
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
