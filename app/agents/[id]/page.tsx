import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import RegistryAgentDetail from "@/components/agents/RegistryAgentDetail";
import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = Number(id);
  if (!Number.isSafeInteger(tokenId) || tokenId < 0) notFound();

  try {
    const identity = await resolveOnChainAgentIdentity(tokenId);
    return <><Navbar /><RegistryAgentDetail identity={identity} /></>;
  } catch {
    notFound();
  }
}
