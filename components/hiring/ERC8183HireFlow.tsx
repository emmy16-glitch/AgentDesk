"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { getPublicClient, getWalletClient } from "@wagmi/core";
import { useAccount, useSwitchChain } from "wagmi";
import { formatUnits, isAddress, type Address, type Hex } from "viem";
import type { ComparedAudition } from "@/lib/auditions/compare";
import { buildAuditionReceipt } from "@/lib/auditions/receipt";
import {
  EMPTY_BYTES,
  ERC8183_DEPLOYMENTS,
  JOB_CREATED_TOPIC,
  JOB_STATUS_LABELS,
  commerceExplorerTx,
  erc20PaymentAbi,
  erc8183CommerceAbi,
  erc8183RouterAbi,
  type SupportedCommerceChainId,
} from "@/lib/erc8183";
import type { Erc8183JobEvidence, Erc8183NegotiatedQuote } from "@/lib/hiring/types";
import { wagmiConfig } from "@/lib/wagmi";

interface Props {
  result: ComparedAudition;
  agentName: string;
}

interface NegotiateResponse {
  ok: boolean;
  quote?: Erc8183NegotiatedQuote;
  error?: string;
  proofBoundary?: string;
}

interface JobSnapshot {
  status: string;
  budget: string;
  provider: string;
  expiredAt: string;
}

function short(value: string, left = 8, right = 6) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function makeJobDescription(result: ComparedAudition, quote: Erc8183NegotiatedQuote) {
  const receipt = buildAuditionReceipt(result);
  return JSON.stringify({
    v: "agentdesk-hire-v1",
    erc8004TokenId: result.candidate.tokenId,
    category: result.task.category,
    auditionReceipt: receipt.receiptHash,
    taskHash: receipt.taskHash,
    quoteCheckedAt: quote.checkedAt,
    quoteExpiresAt: quote.quoteExpiresAt,
    task: quote.taskDescription,
  });
}

function jobIdFromReceipt(receipt: { logs: Array<{ address: string; topics: readonly Hex[] }> }, commerce: Address): bigint {
  const log = receipt.logs.find((entry) =>
    entry.address.toLowerCase() === commerce.toLowerCase()
    && entry.topics[0]?.toLowerCase() === JOB_CREATED_TOPIC.toLowerCase()
    && entry.topics.length > 1,
  );
  const topic = log?.topics[1];
  if (!topic) throw new Error("Create-job transaction confirmed but JobCreated was not found in the receipt");
  return BigInt(topic);
}

export default function ERC8183HireFlow({ result, agentName }: Props) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [negotiating, setNegotiating] = useState(false);
  const [funding, setFunding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Erc8183NegotiatedQuote | null>(null);
  const [job, setJob] = useState<Erc8183JobEvidence | null>(null);
  const [snapshot, setSnapshot] = useState<JobSnapshot | null>(null);
  const receipt = useMemo(() => buildAuditionReceipt(result), [result]);

  const quotedDisplay = quote
    ? `${formatUnits(BigInt(quote.priceBaseUnits), 18)} ${quote.currency}`
    : null;

  async function negotiate() {
    setNegotiating(true);
    setError(null);
    setQuote(null);
    setJob(null);
    setSnapshot(null);
    try {
      const response = await fetch("/api/hiring/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: result.candidate.tokenId, task: result.task }),
      });
      const body = await response.json() as NegotiateResponse;
      if (!response.ok || !body.ok || !body.quote) throw new Error(body.error || "ERC-8183 negotiation failed");
      setQuote(body.quote);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ERC-8183 negotiation failed");
    } finally {
      setNegotiating(false);
    }
  }

  async function createAndFundJob() {
    if (!quote) return;
    if (!isConnected || !address) {
      setError("Connect a wallet first. AgentDesk never holds the buyer key.");
      return;
    }
    if (!isAddress(quote.provider)) {
      setError("Negotiated provider address is invalid.");
      return;
    }
    if (quote.quoteExpiresAt && Date.parse(quote.quoteExpiresAt) <= Date.now()) {
      setError("The agent quote expired. Negotiate fresh terms before funding.");
      return;
    }

    setFunding(true);
    setError(null);
    try {
      if (chainId !== quote.chainId) {
        await switchChainAsync({ chainId: quote.chainId });
      }

      const deployment = ERC8183_DEPLOYMENTS[quote.chainId];
      const publicClient = getPublicClient(wagmiConfig, { chainId: quote.chainId });
      const walletClient = await getWalletClient(wagmiConfig, { chainId: quote.chainId });
      if (!publicClient) throw new Error("BNB Chain RPC client is unavailable");
      if (!walletClient.account) throw new Error("Connected wallet account is unavailable");

      const buyer = walletClient.account.address;
      const budget = BigInt(quote.priceBaseUnits);
      const balance = await publicClient.readContract({
        address: deployment.paymentToken,
        abi: erc20PaymentAbi,
        functionName: "balanceOf",
        args: [buyer],
      });
      if (balance < budget) {
        throw new Error(`Wallet does not have enough $U for this ${formatUnits(budget, 18)} $U job.`);
      }

      const description = makeJobDescription(result, quote);
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 8 * 24 * 60 * 60);

      const createTx = await walletClient.writeContract({
        account: walletClient.account,
        chain: walletClient.chain,
        address: deployment.commerce,
        abi: erc8183CommerceAbi,
        functionName: "createJob",
        args: [quote.provider as Address, deployment.router, expiredAt, description, deployment.router],
      });
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      if (createReceipt.status !== "success") throw new Error("ERC-8183 createJob transaction reverted");
      const jobId = jobIdFromReceipt(createReceipt, deployment.commerce);

      const registerTx = await walletClient.writeContract({
        account: walletClient.account,
        chain: walletClient.chain,
        address: deployment.router,
        abi: erc8183RouterAbi,
        functionName: "registerJob",
        args: [jobId, deployment.policy],
      });
      const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
      if (registerReceipt.status !== "success") throw new Error("ERC-8183 registerJob transaction reverted");

      const budgetTx = await walletClient.writeContract({
        account: walletClient.account,
        chain: walletClient.chain,
        address: deployment.commerce,
        abi: erc8183CommerceAbi,
        functionName: "setBudget",
        args: [jobId, budget, EMPTY_BYTES],
      });
      const budgetReceipt = await publicClient.waitForTransactionReceipt({ hash: budgetTx });
      if (budgetReceipt.status !== "success") throw new Error("ERC-8183 setBudget transaction reverted");

      const allowance = await publicClient.readContract({
        address: deployment.paymentToken,
        abi: erc20PaymentAbi,
        functionName: "allowance",
        args: [buyer, deployment.commerce],
      });

      let approvalTx: Hex | undefined;
      if (allowance < budget) {
        approvalTx = await walletClient.writeContract({
          account: walletClient.account,
          chain: walletClient.chain,
          address: deployment.paymentToken,
          abi: erc20PaymentAbi,
          functionName: "approve",
          args: [deployment.commerce, budget],
        });
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalTx });
        if (approvalReceipt.status !== "success") throw new Error("$U approval transaction reverted");
      }

      const fundTx = await walletClient.writeContract({
        account: walletClient.account,
        chain: walletClient.chain,
        address: deployment.commerce,
        abi: erc8183CommerceAbi,
        functionName: "fund",
        args: [jobId, budget, EMPTY_BYTES],
      });
      const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundTx });
      if (fundReceipt.status !== "success") throw new Error("ERC-8183 fund transaction reverted");

      const evidence: Erc8183JobEvidence = {
        jobId: jobId.toString(),
        chainId: quote.chainId,
        receiptHash: receipt.receiptHash,
        createTx,
        registerTx,
        budgetTx,
        ...(approvalTx ? { approvalTx } : {}),
        fundTx,
        provider: quote.provider,
        priceBaseUnits: quote.priceBaseUnits,
        fundedAt: new Date().toISOString(),
      };
      setJob(evidence);
      await refreshJob(evidence);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ERC-8183 job funding failed");
    } finally {
      setFunding(false);
    }
  }

  async function refreshJob(target = job) {
    if (!target) return;
    setChecking(true);
    setError(null);
    try {
      const deployment = ERC8183_DEPLOYMENTS[target.chainId];
      const publicClient = getPublicClient(wagmiConfig, { chainId: target.chainId });
      if (!publicClient) throw new Error("BNB Chain RPC client is unavailable");
      const current = await publicClient.readContract({
        address: deployment.commerce,
        abi: erc8183CommerceAbi,
        functionName: "getJob",
        args: [BigInt(target.jobId)],
      });
      const value = current as unknown as {
        provider: string;
        budget: bigint;
        expiredAt: bigint;
        status: number;
      };
      setSnapshot({
        provider: value.provider,
        budget: value.budget.toString(),
        expiredAt: new Date(Number(value.expiredAt) * 1000).toISOString(),
        status: JOB_STATUS_LABELS[value.status] ?? `UNKNOWN(${value.status})`,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read ERC-8183 job state");
    } finally {
      setChecking(false);
    }
  }

  return <section className="hire-flow" aria-label={`Hire ${agentName} through ERC-8183`}>
    <div className="hire-flow-heading">
      <div>
        <span className="hire-kicker"><LockKeyhole size={13} /> GENUINE HIRE PATH</span>
        <strong>Hire through ERC-8183 escrow</strong>
      </div>
      <span className="receipt-chip" title={receipt.receiptHash}>receipt {short(receipt.receiptHash)}</span>
    </div>

    {!quote && !job ? <>
      <p>Ask the candidate's ERC-8004-advertised commerce service for fresh signed terms. AgentDesk will not turn the audition price into a paid job by assumption.</p>
      <button type="button" className="hire-action" onClick={negotiate} disabled={negotiating || result.status !== "completed"}>
        {negotiating ? <><Loader2 className="spin" size={15} /> Negotiating…</> : <><ShieldCheck size={15} /> Get current ERC-8183 terms</>}
      </button>
    </> : null}

    {quote && !job ? <div className="hire-terms">
      <div className="hire-proof-row"><span>Network</span><b>{ERC8183_DEPLOYMENTS[quote.chainId].name}</b></div>
      <div className="hire-proof-row"><span>Current quote</span><b>{quotedDisplay}</b></div>
      <div className="hire-proof-row"><span>Provider</span><b title={quote.provider}>{short(quote.provider)}</b></div>
      <div className="hire-proof-row"><span>Provider signature</span><b>{quote.providerSignature ? short(quote.providerSignature) : "not returned"}</b></div>
      <div className="hire-proof-row"><span>Expires</span><b>{quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt).toLocaleTimeString() : "not stated"}</b></div>
      <p className="hire-boundary">This is a current commerce quote. No payment has moved yet. Funding requires your wallet approval.</p>
      {!isConnected ? <p className="hire-warning"><WalletCards size={15} /> Connect your wallet in the wallet panel before funding.</p> : null}
      <button type="button" className="hire-action primary" onClick={createAndFundJob} disabled={funding || !isConnected}>
        {funding ? <><Loader2 className="spin" size={15} /> Creating escrow job…</> : <>Create & fund ERC-8183 job</>}
      </button>
      <button type="button" className="hire-link-button" onClick={negotiate} disabled={negotiating || funding}>Refresh quote</button>
    </div> : null}

    {job ? <div className="hire-job">
      <div className="hire-job-banner"><ShieldCheck size={17} /><div><strong>Escrow funded</strong><span>ERC-8183 job #{job.jobId} now has an independently inspectable on-chain reference.</span></div></div>
      <div className="hire-proof-row"><span>Audition receipt</span><b title={job.receiptHash}>{short(job.receiptHash)}</b></div>
      <div className="hire-proof-row"><span>Job state</span><b>{snapshot?.status ?? "checking…"}</b></div>
      <div className="hire-proof-row"><span>Budget</span><b>{formatUnits(BigInt(job.priceBaseUnits), 18)} $U</b></div>
      <div className="hire-proof-row"><span>Provider</span><b title={job.provider}>{short(job.provider)}</b></div>
      <div className="hire-transactions">
        <a href={commerceExplorerTx(job.chainId, job.createTx)} target="_blank" rel="noreferrer">createJob <ExternalLink size={12} /></a>
        <a href={commerceExplorerTx(job.chainId, job.registerTx)} target="_blank" rel="noreferrer">registerJob <ExternalLink size={12} /></a>
        <a href={commerceExplorerTx(job.chainId, job.budgetTx)} target="_blank" rel="noreferrer">setBudget <ExternalLink size={12} /></a>
        {job.approvalTx ? <a href={commerceExplorerTx(job.chainId, job.approvalTx)} target="_blank" rel="noreferrer">approve $U <ExternalLink size={12} /></a> : null}
        <a href={commerceExplorerTx(job.chainId, job.fundTx)} target="_blank" rel="noreferrer">fund <ExternalLink size={12} /></a>
      </div>
      <button type="button" className="hire-action" disabled={checking} onClick={() => refreshJob()}>
        {checking ? <><Loader2 className="spin" size={15} /> Checking job…</> : <><RefreshCw size={15} /> Check provider progress</>}
      </button>
      <p className="hire-boundary">FUNDED is not completion. AgentDesk will only show delivery/completion after the provider submits and the ERC-8183 state proves it.</p>
    </div> : null}

    {error ? <div className="hire-error" role="alert">{error}</div> : null}
  </section>;
}
