import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import { walletConnect } from "wagmi/connectors/walletConnect";
import { bscTestnet } from "@/lib/bsc";

const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: reownProjectId ? [injected(), walletConnect({ projectId: reownProjectId })] : [injected()],
  transports: { [bscTestnet.id]: http() },
  ssr: true,
});

export const walletConnectEnabled = Boolean(reownProjectId);
