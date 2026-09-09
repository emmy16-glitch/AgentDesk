import type { BrainAnalysis, BrainAnalysisInput, BrainDecision } from "@/lib/brain/types";

function decisionFor(input: BrainAnalysisInput): BrainDecision {
  const { depth } = input.verification;
  if (depth.conflictCount) return "CONFLICT";
  if (depth.verifiedCount && (depth.unresolvedCount || depth.errorCount)) return "MIXED";
  if (depth.verifiedCount) return "LEADING EVIDENCE";
  return "INSUFFICIENT";
}

function categoryWatchouts(input: BrainAnalysisInput): string[] {
  switch (input.task.category) {
    case "Health Factor Monitoring":
      return [
        "A zero Venus shortfall is a current-state observation, not a guarantee that liquidation risk cannot change after prices or collateral move.",
        "Do not treat native BNB balance as a complete lending-position reconstruction.",
      ];
    case "Yield Optimisation":
      return [
        "Pool existence does not verify APY, emissions, incentives, impermanent loss, smart-contract risk or future returns.",
        "Scenario capital is hypothetical until a buyer deliberately funds a real job or transaction.",
      ];
    case "Grid Trading":
      return [
        "A grid that contains the current price can still be economically poor after volatility, fees, slippage and inventory drift.",
        "No orders are placed during an audition or category-depth check.",
      ];
    case "Rebalancing":
      return [
        "Allocation math can be internally correct while the underlying strategy is still unsuitable.",
        "A wallet native-balance read does not reconstruct every BEP-20, LP, lending or staked position.",
      ];
  }
}

function nextQuestionFor(input: BrainAnalysisInput): string | null {
  const unresolved = input.verification.checks.find((check) => check.status === "not-verifiable");
  if (!unresolved) return null;

  if (unresolved.id === "machine-readable-claims") {
    return "Can the agent return the same proposal with clearly structured values so AgentDesk can check the numerical claims?";
  }
  if (input.task.category === "Yield Optimisation") {
    return "Can the agent provide the rate source, pool address and timestamp behind the yield estimate?";
  }
  if (input.task.category === "Grid Trading") {
    return "Can the agent provide its lower price, upper price, number of grid levels and fee tier as clear values?";
  }
  if (input.task.category === "Rebalancing") {
    return "Can the agent provide the target allocation percentages and identify the wallet if live holdings are meant to be checked?";
  }
  return "Can the agent provide the specific health metric and the source used to calculate it?";
}

export function buildEvidenceEngineAnalysis(
  input: BrainAnalysisInput,
  _internalFallbackReason?: string,
): BrainAnalysis {
  const verifiedFacts = input.verification.checks
    .filter((check) => check.status === "verified")
    .map((check) => check.summary);
  const unresolvedClaims = input.verification.checks
    .filter((check) => check.status === "not-verifiable")
    .map((check) => check.summary);
  const conflicts = input.verification.checks
    .filter((check) => check.status === "conflict")
    .map((check) => check.summary);
  const errors = input.verification.checks
    .filter((check) => check.status === "error")
    .map((check) => check.summary);
  const decision = decisionFor(input);

  const headline = decision === "CONFLICT"
    ? "Something in the agent's answer conflicts with what AgentDesk checked."
    : decision === "LEADING EVIDENCE"
      ? "The parts AgentDesk could check support this answer."
      : decision === "MIXED"
        ? "Some parts check out, while other claims still need proof."
        : "There is not enough information to confidently support this answer yet.";

  const summary = `AgentDesk checked the available ${input.task.category.toLowerCase()} evidence and found ${input.verification.depth.verifiedCount} supported item${input.verification.depth.verifiedCount === 1 ? "" : "s"}, ${input.verification.depth.conflictCount} conflict${input.verification.depth.conflictCount === 1 ? "" : "s"}, and ${input.verification.depth.unresolvedCount} unresolved claim${input.verification.depth.unresolvedCount === 1 ? "" : "s"}.`;

  return {
    provider: "agentdesk-evidence-engine",
    providerLabel: "AgentDesk Brain",
    decision,
    headline,
    summary,
    verifiedFacts: verifiedFacts.slice(0, 6),
    unresolvedClaims: unresolvedClaims.slice(0, 6),
    conflicts: conflicts.slice(0, 6),
    watchouts: [...categoryWatchouts(input), ...errors.map((error) => `Check issue: ${error}`)].slice(0, 6),
    nextQuestion: nextQuestionFor(input),
    boundary: "AgentDesk Brain explains what the checks support and keeps anything unconfirmed clearly unresolved.",
    generatedAt: new Date().toISOString(),
  };
}
