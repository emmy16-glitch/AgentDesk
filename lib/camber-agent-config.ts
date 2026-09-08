export interface CamberAssistantConfig {
  id: string;
  agentTag: string;
}

/**
 * Server-side assistant integration config.
 *
 * This is intentionally separate from marketplace discovery. A Camber assistant
 * tag does not prove ERC-8004 registration, marketplace eligibility, liveness,
 * reputation, task fit, or successful hiring.
 */
const CAMBER_ASSISTANTS: Record<string, CamberAssistantConfig> = {
  "healthguard-ai": {
    id: "healthguard-ai",
    agentTag: "@emmanuel.healthguard",
  },
};

export function getCamberAssistant(id: string): CamberAssistantConfig | null {
  return CAMBER_ASSISTANTS[id] ?? null;
}
