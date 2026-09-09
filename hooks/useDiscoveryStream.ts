"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComparedAudition } from "@/lib/auditions/compare";
import type { AuditionTask } from "@/lib/auditions/types";
import type { DiscoveredAgent } from "@/lib/8004scan";
import type { DiscoveryRunSummary, DiscoveryStreamEvent } from "@/lib/discovery/types";
import { parseSseFrames } from "@/lib/discovery/sse";

export type TestPhase = "idle" | "searching" | "qualifying" | "applying-rules" | "shortlisting" | "auditioning" | "comparing" | "complete" | "failed";
export type StreamRace = { tokenId: number; status: "running" | "completed" | "timeout" | "error" | "unsupported"; latencyMs: number | null; message?: string };

interface DiscoveryState {
  phase: TestPhase;
  activities: string[];
  shortlist: DiscoveredAgent[];
  race: StreamRace[];
  results: ComparedAudition[];
  summary: DiscoveryRunSummary | null;
  error: string | null;
}

const initialState: DiscoveryState = { phase: "idle", activities: [], shortlist: [], race: [], results: [], summary: null, error: null };

export function useDiscoveryStream() {
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<DiscoveryState>(initialState);

  const abort = useCallback(() => { controllerRef.current?.abort(); controllerRef.current = null; }, []);

  const apply = useCallback((event: DiscoveryStreamEvent) => {
    setState((current) => {
      if (event.type === "search-started") return { ...initialState, phase: "searching", activities: ["Searching BNB Chain’s agent registry…"] };
      if (event.type === "search-complete") return { ...current, phase: "qualifying", activities: [`${event.matches} relevant ${event.matches === 1 ? "match" : "matches"}`, "Checking availability…"] };
      if (event.type === "qualification-started") return { ...current, phase: "qualifying", activities: [...current.activities.filter((line) => line !== "Checking availability…"), "Checking availability…"] };
      if (event.type === "qualification-complete") return { ...current, phase: "applying-rules", activities: [`${event.reachable} available ${event.reachable === 1 ? "service" : "services"}`, "Applying your rules…"] };
      if (event.type === "rules-applied") return { ...current, phase: "shortlisting", activities: [`${event.suitable} suitable ${event.suitable === 1 ? "agent" : "agents"}`, "Selecting the strongest candidates…"] };
      if (event.type === "shortlist-ready") return { ...current, phase: "auditioning", shortlist: event.candidates, summary: event.summary, activities: [] };
      if (event.type === "audition-started") return { ...current, race: [...current.race, { tokenId: event.tokenId, status: "running", latencyMs: null }] };
      if (event.type === "audition-complete") return { ...current, race: current.race.map((entry) => entry.tokenId === event.tokenId ? { ...entry, status: event.status, latencyMs: event.latencyMs, ...(event.userMessage ? { message: event.userMessage } : {}) } : entry) };
      if (event.type === "comparison-started") return { ...current, phase: "comparing" };
      if (event.type === "comparison-ready") return { ...current, phase: "complete", results: event.results, summary: event.summary };
      if (event.type === "warning") return { ...current, error: event.userMessage, ...(event.code === "no-candidates" || event.code === "no-completed-auditions" || event.code === "search-unavailable" ? { phase: "failed" as const } : {}) };
      if (event.type === "done") return { ...current, summary: event.summary };
      return current;
    });
  }, []);

  const start = useCallback(async (task: AuditionTask) => {
    abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState(initialState);
    try {
      const response = await fetch("/api/discovery/stream", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ task }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("We’re having trouble searching the registry right now.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!controller.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parsed = parseSseFrames(buffer);
        buffer = parsed.remainder;
        for (const event of parsed.events) apply(event);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setState((current) => ({ ...current, phase: "failed", error: cause instanceof Error ? cause.message : "We’re having trouble searching the registry right now." }));
    } finally { if (controllerRef.current === controller) controllerRef.current = null; }
  }, [abort, apply]);

  useEffect(() => () => abort(), [abort]);
  return { ...state, start, abort, reset: () => setState(initialState) };
}
