"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletUIProvider } from "@/components/wallet/WalletProvider";
import { ActiveAgentsProvider } from "@/components/agents/ActiveAgentsProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={queryClient}><WalletUIProvider><ActiveAgentsProvider>{children}</ActiveAgentsProvider></WalletUIProvider></QueryClientProvider></WagmiProvider>;
}
