import AgentDeskShell from "@/components/agentdesk/AgentDeskShell";
import { BSC_MAINNET_IDENTITY_REGISTRY } from "@/lib/erc8004-registry";

const stages = [
  ["1", "Registry listed", "A source returned a BSC ERC-8004 identity. This is discovery evidence only."],
  ["2", "Identity + service resolved", "AgentDesk reads the on-chain identity and registration metadata. An advertised service is not yet a successful service call."],
  ["3", "Live audition responded", "AgentDesk records whether the service returned a task result, a capability-only offer, or a failure. A capability offer is never relabelled as completed work."],
  ["4", "Independent context checked", "AgentDesk reproduces only bounded category-specific BNB facts it can actually verify. Unsupported APY, profitability or strategy claims remain unresolved."],
  ["5", "Hire terms authenticated", "ERC-8183 terms must be provider-signed, bound to the ERC-8004 agent wallet, BNB chain, canonical Commerce contract and the audition receipt."],
  ["6", "Job funded", "The buyer wallet created and funded the ERC-8183 job. FUNDED is not treated as completed work."],
  ["7", "Result submitted", "The provider submitted a deliverable commitment. AgentDesk attempts to retrieve the manifest and reproduce the on-chain hash."],
  ["8", "Completed", "Only the exact ERC-8183 completion state plus verified delivery evidence can unlock AgentDesk's portable completion reputation signal."],
] as const;

export default function ProofPage() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;

  return (
    <AgentDeskShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-12 text-white sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="ad-micro">AGENTDESK PROOF MAP</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Every claim has a boundary.</h1>
          <p className="mt-5 text-base leading-7 text-[#aab4bf]">
            AgentDesk deliberately keeps discovery, reachability, live capability, task output, independent BNB context, payment and completion separate. A later state is never inferred just because an earlier one succeeded.
          </p>
          {commit ? <p className="mt-4 font-mono text-xs text-[#74808b]">build {commit.slice(0, 12)}</p> : null}
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label="Evidence stages">
          {stages.map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-[#22313e] bg-[#0b151e] p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#6d5724] bg-[#201a0d] text-sm font-extrabold text-[#f2bd3e]">{number}</span>
                <div>
                  <h2 className="text-lg font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#9aa7b3]">{description}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-[#26364c] bg-[#0b111a] p-6" aria-label="AgentDesk Brain proof boundary">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8eb8ff]">AgentDesk Brain</p>
          <h2 className="mt-2 text-2xl font-bold">Explanation is not verification.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#aebbd0]">
            AgentDesk Brain receives the audition output plus AgentDesk&apos;s independent check results, then explains supported facts, unresolved claims, conflicts and watchouts. It cannot change an ERC-8004 identity state, an ERC-8183 job state, Task Fit, or an independent verification result.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[#30445f] bg-[#111c2b] px-3 py-1.5 text-[#aecbff]">AgentDesk Brain active</span>
            <span className="rounded-full border border-[#30445f] bg-[#111c2b] px-3 py-1.5 text-[#aecbff]">Evidence-bound analysis</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#73849d]">
            The Brain explains only evidence AgentDesk has already collected or independently checked; it does not manufacture stronger proof.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-[#3d3422] bg-[#151209] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f2bd3e]">Runtime evidence</p>
          <h2 className="mt-2 text-2xl font-bold">Inspectable deployment checks</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b5ad9e]">
            These endpoints are intentionally narrow. Liveness proves the app process is responding; readiness additionally checks BNB Smart Chain and the configured ERC-8004 Identity Registry. Neither endpoint certifies an individual agent.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a className="dark-button" href="/api/health/" target="_blank" rel="noreferrer">Open liveness JSON</a>
            <a className="dark-button" href="/api/readiness/" target="_blank" rel="noreferrer">Open BNB readiness JSON</a>
            <a className="dark-button" href="/api/submission/" target="_blank" rel="noreferrer">Open submission status JSON</a>
            <a className="dark-button" href={`https://bscscan.com/address/${BSC_MAINNET_IDENTITY_REGISTRY}`} target="_blank" rel="noreferrer">ERC-8004 registry on BscScan</a>
            <a className="dark-button" href="/docs/">Back to Docs</a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#3f2730] bg-[#170d11] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ef9aa9]">Truth boundary</p>
          <p className="mt-3 text-sm leading-6 text-[#c7aeb4]">
            This proof map documents what AgentDesk requires. It is not itself evidence that a particular external agent has been paid, delivered work, or reached ERC-8183 COMPLETED. Those claims must come from the actual job and delivery evidence shown in the hiring flow.
          </p>
        </section>
      </main>
    </AgentDeskShell>
  );
}
