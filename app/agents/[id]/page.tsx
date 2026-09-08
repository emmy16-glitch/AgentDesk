import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import AgentDetail from "@/components/agents/AgentDetail";
import { agents, getAgent } from "@/data/agents";

export function generateStaticParams() { return agents.map(({ id }) => ({ id })); }
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const agent = getAgent(id); if (!agent) notFound(); return <><Navbar /><AgentDetail agent={agent} /></>; }
