"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { encodeFunctionData, formatUnits, getAddress, isAddress, type Address, type Hex } from "viem";
import JobEvidencePanel from "@/components/hiring/JobEvidencePanel";
import type { ComparedAudition } from "@/lib/auditions/compare";
import { buildAuditionReceipt } from "@/lib/auditions/receipt";
import { evaluatePriceLimit } from "@/lib/guardrails/evaluate";
import {
  EMPTY_BYTES,
  ERC8183_DEPLOYMENTS,
  JOB_CREATED_TOPIC,
  commerceExplorerTx,
  erc20PaymentAbi,
  erc8183CommerceAbi,
  erc8183RouterAbi,
  type SupportedCommerceChainId,
} from "@/lib/erc8183";
import { buildCanonicalJobDescription, signedTaskContainsReceipt } from "@/lib/hiring/erc8183-negotiation";
import type { Erc8183JobEvidence, Erc8183NegotiatedQuote, ProviderNotificationEvidence } from "@/lib/hiring/types";

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

interface NotifyResponse {
  ok: boolean;
  notified?: boolean;
  detail?: string;
  error?: string;
}

function short(value: string, left = 8, right = 6) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
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
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Erc8183NegotiatedQuote | null>(null);
  const [job, setJob] = useState<Erc8183JobEvidence | null>(null);
  const receipt = useMemo(() => buildAuditionReceipt(result), [result]);
  const commerceChainId: SupportedCommerceChainId = quote?.chainId ?? job?.chainId ?? 56;
  const publicClient = usePublicClient({ chainId: commerceChainId });
  const { data: walletClient } = useWalletClient({ chainId: commerceChainId });

  const quotedDisplay = quote
    ? `${formatUnits(BigInt(quote.priceBaseUnits), 18)} ${quote.currency}`
    : null;

  async function negotiate() {
    if (result.ruleEvaluation.hardFailure) {
      setError("This agent doesn’t meet one of your rules. Choose another agent or change your rules before hiring.");
      return;
    }
    setNegotiating(true);
    setError(null);
    setQuote(null);
    setJob(null);
    try {
      const response = await fetch("/api/hiring/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: result.candidate.tokenId,
          task: result.task,
          auditionReceiptHash: receipt.receiptHash,
        }),
      });
      const body = await response.json() as NegotiateResponse;
      if (!response.ok || !body.ok || !body.quote) throw new Error(body.error || "ERC-8183 negotiation failed");
      if (body.quote.auditionReceiptHash.toLowerCase() !== receipt.receiptHash.toLowerCase()) {
        throw new Error("Returned ERC-8183 quote is not bound to this audition receipt");
      }
      if (!signedTaskContainsReceipt(body.quote.envelope, receipt.receiptHash)) {
        throw new Error("Provider-signed task does not contain this audition receipt");
      }
      setQuote(body.quote);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ERC-8183 negotiation failed");
    } finally {
      setNegotiating(false);
    }
  }

  async function sendTransaction(to: Address, data: Hex): Promise<Hex> {
    if (!walletClient?.account) throw new Error("Connected wallet account is unavailable");
    const hash = await walletClient.request({
      method: "eth_sendTransaction",
      params: [{
        from: walletClient.account.address,
        to,
        data,
      }],
    });
    return hash as Hex;
  }

  async function notifyProvider(jobId: bigint, chain: SupportedCommerceChainId): Promise<ProviderNotificationEvidence> {
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch("/api/hiring/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: result.candidate.tokenId, jobId: jobId.toString(), chainId: chain }),
      });
      const body = await response.json() as NotifyResponse;
      if (!response.ok || !body.ok) {
        return {
          status: "unavailable",
          detail: body.error || "Provider funded-job notification could not be confirmed.",
          checkedAt,
        };
      }
      return {
        status: body.notified ? "sent" : "not-required",
        detail: body.detail || (body.notified ? "Provider accepted funded-job notification." : "Provider push notification was not required."),
        checkedAt,
      };
    } catch (cause) {
      return {
        status: "unavailable",
        detail: cause instanceof Error ? cause.message : "Provider funded-job notification could not be confirmed.",
        checkedAt,
      };
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

    if (chainId !== quote.chainId) {
      setFunding(true);
      setError(null);
      try {
        await switchChainAsync({ chainId: quote.chainId });
        setError(`Wallet switched to ${ERC8183_DEPLOYMENTS[quote.chainId].name}. Confirm the hire again to create and fund the job.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not switch the wallet to the quoted BNB network");
      } finally {
        setFunding(false);
      }
      return;
    }

    if (!publicClient || !walletClient?.account) {
      setError("Wallet/RPC client is still syncing after the network change. Try the hire action again.");
      return;
    }

    setFunding(true);
    setError(null);
    try {
      const deployment = ERC8183_DEPLOYMENTS[quote.chainId];
      const buyer = walletClient.account.address;
      const budget = BigInt(quote.priceBaseUnits);
      const finalPriceRule = evaluatePriceLimit(
        { amount: formatUnits(budget, 18), asset: "$U" },
        result.task.guardrails?.maxPrice,
      );
      if (finalPriceRule?.status === "fail") throw new Error("This price is above the limit you set.");

      const livePaymentToken = await publicClient.readContract({
        address: deployment.commerce,
        abi: erc8183CommerceAbi,
        functionName: "paymentToken",
      });
      if (
        getAddress(livePaymentToken) !== getAddress(deployment.paymentToken)
        || getAddress(livePaymentToken) !== getAddress(quote.paymentToken)
      ) {
        throw new Error("Live Commerce payment token changed after negotiation. Funding was blocked safely; refresh the quote.");
      }

      const description = buildCanonicalJobDescription(quote.envelope);
      if (!description.toLowerCase().includes(receipt.receiptHash.toLowerCase())) {
        throw new Error("Canonical provider-signed job description is not linked to this audition receipt");
      }

      const balance = await publicClient.readContract({
        address: livePaymentToken,
        abi: erc20PaymentAbi,
        functionName: "balanceOf",
        args: [buyer],
      });
      if (balance < budget) {
        throw new Error(`Wallet does not have enough $U for this ${formatUnits(budget, 18)} $U job.`);
      }

      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
      const createData = encodeFunctionData({
        abi: erc8183CommerceAbi,
        functionName: "createJob",
        args: [quote.provider as Address, deployment.router, expiredAt, description, deployment.router],
      });
      const createTx = await sendTransaction(deployment.commerce, createData);
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
      if (createReceipt.status !== "success") throw new Error("ERC-8183 createJob transaction reverted");
      const jobId = jobIdFromReceipt(createReceipt, deployment.commerce);

      const registerData = encodeFunctionData({
        abi: erc8183RouterAbi,
        functionName: "registerJob",
        args: [jobId, deployment.policy],
      });
      const registerTx = await sendTransaction(deployment.router, registerData);
      const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
      if (registerReceipt.status !== "success") throw new Error("ERC-8183 registerJob transaction reverted");

      const budgetData = encodeFunctionData({
        abi: erc8183CommerceAbi,
        functionName: "setBudget",
        args: [jobId, budget, EMPTY_BYTES],
      });
      const budgetTx = await sendTransaction(deployment.commerce, budgetData);
      const budgetReceipt = await publicClient.waitForTransactionReceipt({ hash: budgetTx });
      if (budgetReceipt.status !== "success") throw new Error("ERC-8183 setBudget transaction reverted");

      const allowance = await publicClient.readContract({
        address: livePaymentToken,
        abi: erc20PaymentAbi,
        functionName: "allowance",
        args: [buyer, deployment.commerce],
      });

      let approvalTx: Hex | undefined;
      if (allowance < budget) {
        const approvalData = encodeFunctionData({
          abi: erc20PaymentAbi,
          functionName: "approve",
          args: [deployment.commerce, budget],
        });
        approvalTx = await sendTransaction(livePaymentToken, approvalData);
        const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalTx });
        if (approvalReceipt.status !== "success") throw new Error("$U approval transaction reverted");
      }

      const fundData = encodeFunctionData({
        abi: erc8183CommerceAbi,
        functionName: "fund",
        args: [jobId, budget, EMPTY_BYTES],
      });
      const fundTx = await sendTransaction(deployment.commerce, fundData);
      const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundTx });
      if (fundReceipt.status !== "success") throw new Error("ERC-8183 fund transaction reverted");

      const providerNotification = await notifyProvider(jobId, quote.chainId);
      const fundedJob: Erc8183JobEvidence = {
        jobId: jobId.toString(),
        chainId: quote.chainId,
        receiptHash: receipt.receiptHash,
        createTx,
        registerTx,
        budgetTx,
        ...(approvalTx ? { approvalTx } : {}),
        fundTx,
        fundBlock: fundReceipt.blockNumber.toString(),
        provider: quote.provider,
        priceBaseUnits: quote.priceBaseUnits,
        fundedAt: new Date().toISOString(),
        providerNotification,
      };
      setJob(fundedJob);
      if (providerNotification.status === "unavailable") {
        setError(`Escrow is funded, but provider delivery notification could not be confirmed: ${providerNotification.detail}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ERC-8183 job funding failed");
    } finally {
      setFunding(false);
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
      <p>Ask the candidate&apos;s ERC-8004-advertised commerce/A2A service for fresh provider-signed terms. The audition receipt is inserted before signing so the paid job can be linked back to this exact audition.</p>
      <button type="button" className="hire-action" onClick={negotiate} disabled={negotiating || result.status !== "completed"}>
        {negotiating ? <><Loader2 className="spin" size={15} /> Negotiating & verifying…</> : <><ShieldCheck size={15} /> Get verified ERC-8183 terms</>}
      </button>
    </> : null}

    {quote && !job ? <div className="hire-terms">
      <div className="hire-proof-row"><span>Network</span><b>{ERC8183_DEPLOYMENTS[quote.chainId].name}</b></div>
      <div className="hire-proof-row"><span>Current quote</span><b>{quotedDisplay}</b></div>
      <div className="hire-proof-row"><span>Payment token</span><b title={quote.paymentToken}>{short(quote.paymentToken)}</b></div>
      <div className="hire-proof-row"><span>Provider</span><b title={quote.provider}>{short(quote.provider)}</b></div>
      <div className="hire-proof-row"><span>Provider signature</span><b>{quote.signatureMethod} · block {quote.signatureCheckedAtBlock}</b></div>
      <div className="hire-proof-row"><span>Negotiation hash</span><b title={quote.negotiationHash}>{short(quote.negotiationHash)}</b></div>
      <div className="hire-proof-row"><span>Expires</span><b>{quote.quoteExpiresAt ? new Date(quote.quoteExpiresAt).toLocaleTimeString() : "not stated"}</b></div>
      <p className="hire-boundary">Provider signature, BNB chain, Commerce contract, live payment token and audition receipt have been checked. No payment has moved yet.</p>
      {!isConnected ? <p className="hire-warning"><WalletCards size={15} /> Connect your wallet in the wallet panel before funding.</p> : null}
      <button type="button" className="hire-action primary" onClick={createAndFundJob} disabled={funding || !isConnected}>
        {funding ? <><Loader2 className="spin" size={15} /> Preparing ERC-8183 job…</> : <>Create & fund signed ERC-8183 job</>}
      </button>
      <button type="button" className="hire-link-button" onClick={negotiate} disabled={negotiating || funding}>Refresh signed quote</button>
    </div> : null}

    {job && quote ? <div className="hire-job">
      <div className="hire-job-banner"><ShieldCheck size={17} /><div><strong>Escrow funded</strong><span>ERC-8183 job #{job.jobId} contains the exact provider-signed terms and audition receipt commitment.</span></div></div>
      <div className="hire-proof-row"><span>Audition receipt</span><b title={job.receiptHash}>{short(job.receiptHash)}</b></div>
      <div className="hire-proof-row"><span>Budget</span><b>{formatUnits(BigInt(job.priceBaseUnits), 18)} $U</b></div>
      <div className="hire-proof-row"><span>Provider</span><b title={job.provider}>{short(job.provider)}</b></div>
      <div className="hire-proof-row"><span>Provider trigger</span><b>{job.providerNotification.status}</b></div>
      <p className="hire-boundary">{job.providerNotification.detail}</p>
      <div className="hire-transactions">
        <a href={commerceExplorerTx(job.chainId, job.createTx)} target="_blank" rel="noreferrer">createJob <ExternalLink size={12} /></a>
        <a href={commerceExplorerTx(job.chainId, job.registerTx)} target="_blank" rel="noreferrer">registerJob <ExternalLink size={12} /></a>
        <a href={commerceExplorerTx(job.chainId, job.budgetTx)} target="_blank" rel="noreferrer">setBudget <ExternalLink size={12} /></a>
        {job.approvalTx ? <a href={commerceExplorerTx(job.chainId, job.approvalTx)} target="_blank" rel="noreferrer">approve $U <ExternalLink size={12} /></a> : null}
        <a href={commerceExplorerTx(job.chainId, job.fundTx)} target="_blank" rel="noreferrer">fund <ExternalLink size={12} /></a>
      </div>
      <JobEvidencePanel
        job={job}
        tokenId={result.candidate.tokenId}
        category={result.task.category}
        serviceEndpoint={quote.serviceEndpoint}
      />
    </div> : null}

    {error ? <div className="hire-error" role="alert">{error}</div> : null}
  </section>;
}
