"use client";

import CategoryDepthPanel from "@/components/auditions/CategoryDepthPanel";
import type { ComparedAudition } from "@/lib/auditions/compare";

/**
 * Backwards-compatible wrapper retained for the Phase 3 result-card integration.
 * Phase 5 deepens the old generic independent check into a category-specific
 * evidence + AgentDesk Brain panel without changing the hiring boundary.
 */
export default function IndependentCheck({ result }: { result: ComparedAudition }) {
  return <CategoryDepthPanel result={result} />;
}
