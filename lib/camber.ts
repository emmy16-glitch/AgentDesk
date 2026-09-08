const fallback = (question: string) => `HealthGuard AI: ${question.includes("trust") ? "Review verified identity, on-chain activity, and the permissions you grant before relying on any agent. " : ""}For lending safety, keep a buffer above the protocol's liquidation health-factor threshold and enable alerts before collateral volatility can put a position at risk.`;

export async function askHealthGuard(question: string) {
  const endpoint = process.env.CAMBER_API_URL;
  const apiKey = process.env.CAMBER_API_KEY;
  if (!endpoint || !apiKey) return { answer: fallback(question), source: "local-demo" as const };
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ agentId: process.env.CAMBER_HEALTHGUARD_AGENT_ID || "healthguard-ai", message: question }), cache: "no-store" });
  if (!response.ok) throw new Error("Camber AI is temporarily unavailable.");
  const payload = await response.json() as { answer?: string; message?: string; output?: string };
  const answer = payload.answer || payload.message || payload.output;
  if (!answer) throw new Error("Camber AI returned an empty response.");
  return { answer, source: "camber" as const };
}
