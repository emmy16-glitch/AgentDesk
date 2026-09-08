"use client";

import { FormEvent, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Send, Sparkles } from "lucide-react";

const starterAnswer = "HealthGuard AI monitors your lending positions continuously. Review its permissions, use a dedicated wallet, and set alerts before your health factor approaches the liquidation threshold.";

export default function AIAssistant({ compact = false }: { compact?: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(starterAnswer);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const abortRef = useRef<AbortController | null>(null);
  async function ask(event: FormEvent) {
    event.preventDefault(); const text = question.trim(); if (!text || status === "loading") return;
    abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller;
    setStatus("loading");
    try { const response = await fetch("/api/ai/healthguard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }), signal: controller.signal }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "HealthGuard could not answer right now."); setAnswer(payload.answer); setQuestion(""); setStatus("idle"); }
    catch (reason) { if ((reason as Error).name !== "AbortError") { setStatus("error"); setAnswer(reason instanceof Error ? reason.message : "HealthGuard could not answer right now."); } }
  }
  return <section className={`side-card assistant-card ${compact ? "assistant-compact" : ""}`}><h2><span><Sparkles size={22} /></span>AI Assistant</h2><p className="side-subtitle">Ask HealthGuard about trust and DeFi risk</p><button type="button" className="selected-agent"><span>HG</span>HealthGuard AI<ChevronDown size={15} /></button><div className="suggestion">Should I trust this agent?</div><div className="assistant-response" aria-live="polite"><p>{answer}</p>{!compact && <ul>{["Verified identity (ERC-8004)", "Health factor risk coverage", "No critical vulnerabilities", "Active BNB Chain usage"].map(item => <li key={item}><Check size={14} />{item}</li>)}</ul>}{status === "error" && <p className="ai-error">Try again or check your AI configuration.</p>}</div><form className="ask-input" onSubmit={ask} noValidate><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question..." aria-label="Ask HealthGuard AI" onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} /><button type="submit" aria-label="Send question" disabled={status === "loading"}>{status === "loading" ? <LoaderCircle className="spin" size={18} /> : <Send size={19} />}</button></form></section>;
}
