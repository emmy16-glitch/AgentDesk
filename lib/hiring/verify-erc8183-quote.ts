import {
  createPublicClient,
  getAddress,
  hashMessage,
  http,
  isAddress,
  keccak256,
  recoverMessageAddress,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { bscMainnet, bscTestnet } from "@/lib/bsc";
import {
  canonicalJson,
  recomputeNegotiationHash,
  type CanonicalNegotiationEnvelope,
} from "@/lib/hiring/erc8183-negotiation";

const ERC1271_MAGIC_VALUE = "0x1626ba7e";
const HASH_HEX = /^0x[0-9a-fA-F]{64}$/;
const SIGNATURE_HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
const erc1271Abi = [{
  type: "function",
  name: "isValidSignature",
  stateMutability: "view",
  inputs: [
    { name: "hash", type: "bytes32" },
    { name: "signature", type: "bytes" },
  ],
  outputs: [{ name: "magicValue", type: "bytes4" }],
}] as const;

export type QuoteSignatureMethod = "eip191" | "erc1271";

function clientFor(chainId: 56 | 97) {
  const chain = chainId === 56 ? bscMainnet : bscTestnet;
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0], { timeout: 8_000 }),
  });
}

function expirySeconds(envelope: CanonicalNegotiationEnvelope): number | null {
  const response = envelope.response;
  const value = envelope.quote_expires_at ?? response.quote_expires_at;
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

async function verifyProviderSignature({
  chainId,
  provider,
  verifier,
  negotiationHash,
  providerSig,
  blockNumber,
}: {
  chainId: 56 | 97;
  provider: Address;
  verifier: Address;
  negotiationHash: Hex;
  providerSig: Hex;
  blockNumber?: bigint;
}): Promise<QuoteSignatureMethod> {
  const client = clientFor(chainId);
  const trustedProvider = getAddress(provider);

  try {
    const recovered = await recoverMessageAddress({
      message: negotiationHash,
      signature: providerSig,
    });
    if (getAddress(recovered) === trustedProvider) return "eip191";
  } catch {
    // Account-wallet signatures are checked through ERC-1271 below.
  }

  const historical = blockNumber === undefined ? {} : { blockNumber };
  const bytecode = await client.getBytecode({ address: trustedProvider, ...historical });
  if (!bytecode || bytecode === "0x") {
    throw new Error("ERC-8183 provider_sig is not valid for the ERC-8004 agent wallet");
  }

  const magic = await client.readContract({
    address: trustedProvider,
    abi: erc1271Abi,
    functionName: "isValidSignature",
    args: [hashMessage(negotiationHash), providerSig],
    account: getAddress(verifier),
    ...historical,
  });
  if (String(magic).toLowerCase() !== ERC1271_MAGIC_VALUE) {
    throw new Error("ERC-1271 provider account rejected the ERC-8183 provider_sig");
  }
  return "erc1271";
}

export async function verifyCanonicalProviderQuote({
  envelope,
  expectedProvider,
  expectedVerifyingContract,
}: {
  envelope: CanonicalNegotiationEnvelope;
  expectedProvider: Address;
  expectedVerifyingContract: Address;
}): Promise<{ method: QuoteSignatureMethod; signer: Address; blockNumber: bigint }> {
  const client = clientFor(envelope.chain_id);
  const provider = getAddress(expectedProvider);
  const verifier = getAddress(expectedVerifyingContract);

  if (getAddress(envelope.verifying_contract) !== verifier) {
    throw new Error("ERC-8183 quote verifying_contract does not match the canonical Commerce contract");
  }

  const recomputed = recomputeNegotiationHash(envelope);
  if (recomputed.toLowerCase() !== envelope.negotiation_hash.toLowerCase()) {
    throw new Error("ERC-8183 negotiation_hash does not match the signed quote content");
  }

  const block = await client.getBlock();
  const expires = expirySeconds(envelope);
  if (expires !== null && BigInt(expires) <= block.timestamp) {
    throw new Error("ERC-8183 provider quote is expired at the current BNB block");
  }

  const method = await verifyProviderSignature({
    chainId: envelope.chain_id,
    provider,
    verifier,
    negotiationHash: envelope.negotiation_hash,
    providerSig: envelope.provider_sig,
  });
  return { method, signer: provider, blockNumber: block.number };
}

export async function verifyFundedJobDescription({
  description,
  chainId,
  provider,
  expectedVerifyingContract,
  acceptanceBlock,
}: {
  description: string;
  chainId: 56 | 97;
  provider: Address;
  expectedVerifyingContract: Address;
  acceptanceBlock: bigint;
}): Promise<{ method: QuoteSignatureMethod; negotiationHash: Hex }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(description) as unknown;
  } catch {
    throw new Error("On-chain ERC-8183 job description is not canonical JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("On-chain ERC-8183 job description is not a signed quote record");
  }
  const object = parsed as Record<string, unknown>;
  const negotiationHash = typeof object.negotiation_hash === "string" ? object.negotiation_hash : "";
  const providerSig = typeof object.provider_sig === "string" ? object.provider_sig : "";
  if (!HASH_HEX.test(negotiationHash) || !SIGNATURE_HEX.test(providerSig)) {
    throw new Error("On-chain ERC-8183 job is missing negotiation_hash/provider_sig");
  }

  if (object.chain_id !== chainId) throw new Error("On-chain signed job description has the wrong chain_id");
  const verifying = typeof object.verifying_contract === "string" ? object.verifying_contract : "";
  if (!isAddress(verifying) || getAddress(verifying) !== getAddress(expectedVerifyingContract)) {
    throw new Error("On-chain signed job description has the wrong verifying_contract");
  }

  const unsigned = Object.fromEntries(
    Object.entries(object).filter(([key]) => key !== "negotiation_hash" && key !== "provider_sig"),
  );
  const recomputed = keccak256(toHex(canonicalJson(unsigned)));
  if (recomputed.toLowerCase() !== negotiationHash.toLowerCase()) {
    throw new Error("On-chain job description no longer matches its signed negotiation_hash");
  }

  const method = await verifyProviderSignature({
    chainId,
    provider: getAddress(provider),
    verifier: getAddress(expectedVerifyingContract),
    negotiationHash: negotiationHash as Hex,
    providerSig: providerSig as Hex,
    blockNumber: acceptanceBlock,
  });
  return { method, negotiationHash: negotiationHash as Hex };
}

export async function readCommercePaymentToken({
  chainId,
  commerce,
}: {
  chainId: 56 | 97;
  commerce: Address;
}): Promise<Address> {
  const client = clientFor(chainId);
  const token = await client.readContract({
    address: commerce,
    abi: [{
      type: "function",
      name: "paymentToken",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "address" }],
    }] as const,
    functionName: "paymentToken",
  });
  return getAddress(token);
}
