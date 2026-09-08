"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { encodeFunctionData, type Hex } from "viem";
import { completionFeedback, ERC8004_REPUTATION_REGISTRY, erc8004ReputationAbi } from "@/lib/erc8004-reputation";
import { bscScanTxUrl } from "@/lib/bsc";
import type { Erc8183JobEvidence } from "@/lib/hiring/types";

interface JobCheckResponse {
  ok: boolean;
  error?: string;
  checkedAt?: string;
  identity?: {
    tokenId: number;
    agentWallet: string | null;
    sourceUrl: string;
  };
  job?: {
    jobId: string;
    chainId: 56 | 97;
    client: string;
    provider: string;
    evaluator: string;
    description: string;
    budget: string;
    expiredAt: string;
    status: string;
    statusCode: number;
    hook: string;
  };
  deliverable?: null | {
    available: true;
    source: string;
    contentHash: string;
    value: unknown;
  };
  deliverableError?: string | null;
  proofBoundary?: string;
}

function printable(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function JobEvidencePanel({
  job,
  tokenId,
  category,
  serviceEndpoint,
}: {
  job: Erc8183JobEvidence;
  tokenId: number;
  category: string;
  serviceEndpoint: string;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const reputationChainId = 56 as const;
  const reputationPublicClient = usePublicClient({ chainId: reputationChainId });
  const { data: reputationWallet } = useWalletClient({ chainId: reputationChainId });
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [check, setCheck] = useState<JobCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackTx, setFeedbackTx] = useState<Hex | null>(null);

  async function refresh() {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/hiring/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, jobId: job.jobId, chainId: job.chainId }),
      });
      const body = await response.json() as JobCheckResponse;
      if (!response.ok || !body.ok || !body.job) throw new Error(body.error || "Could not verify the ERC-8183 job");
      setCheck(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify the ERC-8183 job");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { void refresh(); }, []); // one source-backed check after funding

  async function publishCompletionFeedback() {
    if (!check?.job || check.job.status !== "COMPLETED") {
      setError("Completion feedback is locked until ERC-8183 reports COMPLETED on-chain.");
      return;
    }
    if (!isConnected || !address) {
      setError("Reconnect the wallet that funded this job before publishing completion feedback.");
      return;
    }
    if (address.toLowerCase() !== check.job.client.toLowerCase()) {
      setError("Only the wallet recorded as this ERC-8183 job client can publish AgentDesk's payment-backed completion signal.");
      return;
    }
    if (check.identity?.agentWallet && address.toLowerCase() === check.identity.agentWallet.toLowerCase()) {
      setError("ERC-8004 blocks self-feedback. The provider cannot publish its own AgentDesk completion signal.");
      return;
    }
    if (chainId !== reputationChainId) {
      try {
        await switchChainAsync({ chainId: reputationChainId });
        setError("Wallet switched to BNB Smart Chain. Confirm Publish again to write the ERC-8004 reputation signal.");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not switch to BNB Smart Chain for ERC-8004 feedback");
      }
      return;
    }
    if (!reputationWallet?.account || !reputationPublicClient) {
      setError("Reputation wallet client is still syncing. Try again in a moment.");
      return;
    }

    setPublishing(true);
    setError(null);
    try {
      const signal = completionFeedback({
        agentId: tokenId,
        category,
        endpoint: serviceEndpoint,
        receiptHash: job.receiptHash as Hex,
      });
      const data = encodeFunctionData({
        abi: erc8004ReputationAbi,
        functionName: "giveFeedback",
        args: [
          signal.agentId,
          signal.value,
          signal.valueDecimals,
          signal.tag1,
          signal.tag2,
          signal.endpoint,
          signal.feedbackURI,
          signal.feedbackHash,
        ],
      });
      const hash = await reputationWallet.request({
        method: "eth_sendTransaction",
        params: [{
          from: reputationWallet.account.address,
          to: ERC8004_REPUTATION_REGISTRY[reputationChainId],
          data,
        }],
      }) as Hex;
      const receipt = await reputationPublicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("ERC-8004 reputation transaction reverted");
      setFeedbackTx(hash);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish ERC-8004 completion feedback");
    } finally {
      setPublishing(false);
    }
  }

  return <div className="job-evidence-panel">
    <div className="job-evidence-heading">
      <div>
        <span>PROVIDER DELIVERY</span>
        <strong>{check?.job?.status ?? (checking ? "Checking on-chain state…" : "Not checked")}</strong>
      </div>
      <button type="button" className="hire-link-button" onClick={refresh} disabled={checking}>
        {checking ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Refresh evidence
      </button>
    </div>

    {check?.proofBoundary ? <p className="hire-boundary">{check.proofBoundary}</p> : null}

    {check?.deliverable ? <div className="provider-deliverable">
      <div className="provider-deliverable-title"><CheckCircle2 size={15} /><strong>Provider result retrieved</strong></div>
      <pre>{printable(check.deliverable.value)}</pre>
      <div className="deliverable-proof">
        <span title={check.deliverable.contentHash}>content hash {check.deliverable.contentHash.slice(0, 12)}…</span>
        <a href={check.deliverable.source} target="_blank" rel="noreferrer">provider source <ExternalLink size={11} /></a>
      </div>
    </div> : null}

    {check?.deliverableError ? <div className="hire-warning">Result retrieval: {check.deliverableError}</div> : null}

    {check?.job?.status === "COMPLETED" ? <div className="portable-reputation">
      <div><ShieldCheck size={16} /><span><strong>Portable completion reputation</strong><small>Publish one binary ERC-8004 signal backed by this paid job and the audition receipt. No subjective star score is invented.</small></span></div>
      {feedbackTx ? <a href={bscScanTxUrl(feedbackTx, 56)} target="_blank" rel="noreferrer" className="reputation-proof-link">Feedback on BscScan <ExternalLink size={12} /></a> : <button type="button" className="hire-action" onClick={publishCompletionFeedback} disabled={publishing}>
        {publishing ? <><Loader2 size={14} className="spin" /> Publishing…</> : <>Publish verified completion to ERC-8004</>}
      </button>}
    </div> : null}

    {error ? <div className="hire-error" role="alert">{error}</div> : null}
  </div>;
}
