"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LoaderCircle, Wallet, X } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { Address } from "viem";
import { walletConnectEnabled } from "@/lib/wagmi";

type WalletUIContextValue = { openConnect: () => void; disconnectWallet: () => void; connected: boolean; address?: Address; chainId?: number };
const WalletUIContext = createContext<WalletUIContextValue | null>(null);

export function WalletUIProvider({ children }: { children: ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connectAsync, isPending } = useConnect();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const connect = useCallback(async (connectorId: string) => {
    const connector = connectors.find((item) => item.id === connectorId);
    if (!connector) return;
    setError("");
    try { await connectAsync({ connector, chainId: 97 }); setOpen(false); }
    catch (reason) { const error = reason as Error & { shortMessage?: string }; setError(error.shortMessage || error.message || "Wallet connection was cancelled."); }
  }, [connectAsync, connectors]);

  const value = useMemo(() => ({ openConnect: () => setOpen(true), disconnectWallet: () => disconnect(), connected: isConnected, address, chainId }), [address, chainId, disconnect, isConnected]);
  return <WalletUIContext.Provider value={value}>{children}{open && <div className="wallet-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Close wallet selection" onClick={() => setOpen(false)}><X size={18} /></button><span className="wallet-modal-icon"><Wallet size={23} /></span><h2 id="wallet-modal-title">Connect a wallet</h2><p>Choose a BNB Smart Chain compatible wallet.</p>{connectors.map((connector) => <button className="wallet-option" type="button" key={connector.id} disabled={isPending} onClick={() => connect(connector.id)}><span>{connector.name === "WalletConnect" ? "WC" : "◈"}</span>{connector.name}{isPending && <LoaderCircle className="spin" size={16} />}</button>)}{!walletConnectEnabled && <div className="wallet-config-note">WalletConnect is ready when <code>NEXT_PUBLIC_REOWN_PROJECT_ID</code> is configured.</div>}{error && <p className="wallet-error" role="alert">{error}</p>}</section></div>}</WalletUIContext.Provider>;
}

export function useWallet() { const context = useContext(WalletUIContext); if (!context) throw new Error("useWallet must be used inside WalletUIProvider"); return context; }
