"use client";

import { Copy, Wallet } from "lucide-react";
import { useBalance } from "wagmi";
import { formatEther } from "viem";
import { useWallet } from "@/components/wallet/WalletProvider";

export default function WalletPanel() {
  const { address, connected, disconnectWallet, openConnect } = useWallet();
  const { data: balance } = useBalance({ address });
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "No wallet connected";
  const shownBalance = connected && balance ? `${Number(formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : "—";
  async function copyAddress() { if (address) await navigator.clipboard.writeText(address); }
  return <section className="side-card wallet-card"><h2><span><Wallet size={22} /></span>Prototype Wallet</h2><p className="side-subtitle">Discovery reads BSC mainnet. This wallet panel remains on BSC Testnet until real Agent Studio hiring replaces the prototype activation flow.</p><div className="wallet-address"><span><Wallet size={20} /></span><b>{shortAddress}</b>{connected && <button type="button" aria-label="Copy wallet address" onClick={copyAddress}><Copy size={15} /></button>}</div><div className="wallet-info"><p>Execution network <b><i /> BSC Testnet</b></p><p>Balance <strong>{shownBalance}</strong></p></div><button type="button" className="disconnect" onClick={connected ? disconnectWallet : openConnect}>{connected ? "Disconnect Wallet" : "Connect Testnet Wallet"}</button></section>;
}
