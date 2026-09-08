"use client";

import { ChevronDown, Wallet } from "lucide-react";
import { CubeMark } from "./Hero";
import { useWallet } from "@/components/wallet/WalletProvider";

export default function Navbar() {
  const { address, connected, openConnect } = useWallet();
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect Wallet";
  return <nav className="top-nav"><div className="nav-inner"><a className="brand" href="/"><CubeMark /><span>Agent<span>Desk</span></span></a><div className="nav-links"><a className="current" href="/">Marketplace</a><a href="/#agents">Explore</a><a href="/#how-it-works">How it works</a><a href="https://github.com/emmy16-glitch/AgentDesk#readme" target="_blank" rel="noreferrer">Docs</a></div><div className="nav-controls"><button type="button" className="network" title="Agent discovery currently reads the BSC mainnet ERC-8004 registry"><b />BSC Mainnet Registry<ChevronDown size={15} /></button><button type="button" className="account" onClick={openConnect}><Wallet size={18} /><span>{shortAddress}</span>{connected && <ChevronDown size={15} />}</button></div></div></nav>;
}
