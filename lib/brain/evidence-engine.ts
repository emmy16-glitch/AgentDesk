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
    return "Can the agent return the same proposal with the requested AgentDesk JSON block so the numerical claims can be tested deterministically?";
  }
  if (input.task.category === "Yield Optimisation") {
    return "Can the agent provide a machine-readable protocol rate source, pool address and timestamp for the APY claim?";
  }
  if (input.task.category === "Grid Trading") {
    return "Can the agent expose lowerPrice, upperPrice, gridCount and feeTier as machine-readable fields?";
  }
  if (input.task.category === "Rebalancing") {
    return "Can the agent expose targetAllocations as token-to-percentage values and identify the actual wallet when live holdings are meant to be checked?";
  }
  return "Can the agent expose the specific health metric and its source in machine-readable form?";
}

export function buildEvidenceEngineAnalysis(input: BrainAnalysisInput): BrainAnalysis {
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
    ? "Live evidence conflicts with at least one agent claim."
    : decision === "LEADING EVIDENCE"
      ? "The independently reproducible checks support the observable parts of this audition."
      : decision === "MIXED"
        ? "Some claims are supported by live evidence while important claims remain unresolved."
        : "There is not enough independently reproducible evidence to upgrade this audition beyond its raw response.";

  const ruleSummary = input.ruleEvaluation
    ? ` Your rules: ${input.ruleEvaluation.passedCount} confirmed, ${input.ruleEvaluation.unknownCount} unconfirmed, ${input.ruleEvaluation.failedCount} conflicting.`
    : "";
  const summary = `${input.task.category}: AgentDesk reproduced ${input.verification.depth.verifiedCount} supported check${input.verification.depth.verifiedCount === 1 ? "" : "s"}, found ${input.verification.depth.conflictCount} conflict${input.verification.depth.conflictCount === 1 ? "" : "s"}, and left ${input.verification.depth.unresolvedCount} claim${input.verification.depth.unresolvedCount === 1 ? "" : "s"} unresolved.${ruleSummary} This analysis explains the evidence; it does not create new proof.`;

  return {
    decision,
    headline,
    summary,
    verifiedFacts: verifiedFacts.slice(0, 6),
    unresolvedClaims: unresolvedClaims.slice(0, 6),
    conflicts: conflicts.slice(0, 6),
    watchouts: [...categoryWatchouts(input), ...errors.map((error) => `Verifier error: ${error}`)].slice(0, 6),
    nextQuestion: nextQuestionFor(input),
    boundary: "AgentDesk Brain summarizes evidence already produced by AgentDesk checks. It never upgrades an unverified claim into verified evidence.",
    generatedAt: new Date().toISOString(),
  };
}
