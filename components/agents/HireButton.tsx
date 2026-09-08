"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { parseEther } from "viem";
import { usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import type { Agent } from "@/data/agents";
import { bscTestnet } from "@/lib/bsc";
import { marketplaceAbi, marketplaceAddress } from "@/lib/marketplace-contract";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useActiveAgents } from "@/components/agents/ActiveAgentsProvider";

export default function HireButton({ agent, className = "hire-button" }: { agent: Agent; className?: string }) {
  const { connected, chainId, openConnect } = useWallet();
  const { addActivation } = useActiveAgents();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: bscTestnet.id });
  const [status, setStatus] = useState<"idle" | "confirming" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function hire() {
    if (!connected) { openConnect(); return; }
    if (!marketplaceAddress) { setStatus("error"); setMessage("Marketplace contract is not configured. Add NEXT_PUBLIC_AGENTTRUST_MARKETPLACE_ADDRESS after deployment."); return; }
    try {
      setStatus("confirming"); setMessage("");
      if (chainId !== bscTestnet.id) await switchChainAsync({ chainId: bscTestnet.id });
      const hash = await writeContractAsync({ address: marketplaceAddress, abi: marketplaceAbi, functionName: "hireAgent", args: [BigInt(agent.contractId)], value: parseEther(agent.price), chainId: bscTestnet.id });
      setStatus("pending");
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt?.status !== "success") throw new Error("The transaction was not confirmed.");
      addActivation(agent, hash); setStatus("success"); setMessage("Agent activated successfully.");
    } catch (reason) { const error = reason as Error & { shortMessage?: string }; setStatus("error"); setMessage(error.shortMessage || error.message || "Transaction was not completed."); }
  }

  const label = !connected ? "Connect to Hire" : status === "confirming" ? "Confirm in wallet" : status === "pending" ? "Confirming…" : status === "success" ? "Activated" : "Hire Agent";
  return <div className="hire-action"><button type="button" className={className} onClick={hire} disabled={status === "confirming" || status === "pending" || status === "success"}>{(status === "confirming" || status === "pending") && <LoaderCircle className="spin" size={15} />}{label}</button>{message && <p className={status === "success" ? "hire-success" : "hire-error"} role="status">{message}</p>}</div>;
}
