import { resolveOnChainAgentIdentity } from "@/lib/erc8004-registry";
import { auditionA2AService } from "@/lib/auditions/a2a";
import type { AuditionEvidence, AuditionRequest, AuditionResult, TaskFitExplanation } from "@/lib/auditions/types";

function explainTaskFit(result: {
  status: AuditionResult["status"];
  latencyMs: number | null;
  quote: AuditionResult["quote"];
  hasA2AService: boolean;
  hasOutput: boolean;
}): TaskFitExplanation {
  const reasons: string[] = [];
  const missingEvidence: string[] = [];

  if (result.hasA2AService) reasons.push("The ERC-8004 registration advertises an A2A service endpoint.");
  else missingEvidence.push("No A2A service is advertised in the resolved ERC-8004 metadata.");

  if (result.status === "completed" && result.hasOutput) {
    reasons.push("The agent returned a task-specific response to a bounded read-only audition request.");
  } else if (result.status === "timeout") {
    missingEvidence.push("The audition timed out, so AgentDesk has no current task-specific result.");
  } else if (result.status === "unsupported") {
    missingEvidence.push("The current AgentDesk adapter could not complete this advertised service flow.");
  } else if (result.status === "error") {
    missingEvidence.push("The live audition failed, so the response cannot be treated as task-fit evidence.");
  }

  if (result.latencyMs !== null) reasons.push(`Live audition latency was measured at ${result.latencyMs} ms.`);
  else missingEvidence.push("No live audition latency was measured.");

  if (result.quote) reasons.push(`The agent returned a current quote of ${result.quote.amount} ${result.quote.asset}.`);
  else missingEvidence.push("No machine-readable current quote was returned.");

  if (result.status === "completed" && result.hasOutput) {
    missingEvidence.push("AgentDesk has not yet independently validated the economic correctness of the returned strategy/output.");
    return { label: "PARTIAL FIT", reasons, missingEvidence };
  }

  return { label: "NOT ENOUGH EVIDENCE", reasons, missingEvidence };
}

function isA2AServiceName(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === "a2a" || normalized.startsWith("a2a");
}

export async function runAudition(request: AuditionRequest): Promise<AuditionResult> {
  const identity = await resolveOnChainAgentIdentity(request.tokenId);
  const identityEvidence: AuditionEvidence = {
    kind: "identity",
    source: identity.explorerUrl,
    observedAt: identity.checkedAt,
    summary: `Resolved ERC-8004 identity #${identity.tokenId} on BNB Smart Chain and read its advertised services directly from registration metadata.`,
    raw: {
      registryAddress: identity.registryAddress,
      owner: identity.owner,
      agentWallet: identity.agentWallet,
      agentUri: identity.agentUri,
      metadataStatus: identity.metadataStatus,
      services: identity.services,
    },
  };

  const a2aService = identity.services.find((service) => isA2AServiceName(service.name));
  if (!a2aService) {
    const taskFit = explainTaskFit({
      status: "unsupported",
      latencyMs: null,
      quote: null,
      hasA2AService: false,
      hasOutput: false,
    });

    return {
      candidate: {
        chainId: 56,
        tokenId: identity.tokenId,
        registry: "ERC-8004",
        registryAddress: identity.registryAddress,
        owner: identity.owner,
        agentWallet: identity.agentWallet,
        sourceUrl: identity.explorerUrl,
      },
      task: request.task,
      status: "unsupported",
      protocol: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      quote: null,
      output: null,
      evidence: [identityEvidence],
      taskFit,
      error: "This ERC-8004 registration does not advertise an A2A service. AgentDesk will not guess a task endpoint from a generic web URL.",
    };
  }

  const execution = await auditionA2AService(a2aService, request.task);
  const taskFit = explainTaskFit({
    status: execution.status,
    latencyMs: execution.latencyMs,
    quote: execution.quote,
    hasA2AService: true,
    hasOutput: Boolean(execution.output),
  });

  return {
    candidate: {
      chainId: 56,
      tokenId: identity.tokenId,
      registry: "ERC-8004",
      registryAddress: identity.registryAddress,
      owner: identity.owner,
      agentWallet: identity.agentWallet,
      sourceUrl: identity.explorerUrl,
    },
    task: request.task,
    status: execution.status,
    protocol: "A2A",
    latencyMs: execution.latencyMs,
    checkedAt: execution.checkedAt,
    quote: execution.quote,
    output: execution.output,
    evidence: [identityEvidence, ...execution.evidence],
    taskFit,
    ...(execution.error ? { error: execution.error } : {}),
  };
}
