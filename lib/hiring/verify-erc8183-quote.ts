import {
  createPublicClient,
  getAddress,
  hashMessage,
  http,
  recoverMessageAddress,
  type Address,
  type Hex,
} from "viem";
import { bscMainnet, bscTestnet } from "@/lib/bsc";
import { recomputeNegotiationHash, type CanonicalNegotiationEnvelope } from "@/lib/hiring/erc8183-negotiation";

const ERC1271_MAGIC_VALUE = "0x1626ba7e";
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

  try {
    const recovered = await recoverMessageAddress({
      message: envelope.negotiation_hash,
      signature: envelope.provider_sig,
    });
    if (getAddress(recovered) === provider) {
      return { method: "eip191", signer: provider, blockNumber: block.number };
    }
  } catch {
    // Account-wallet signatures are checked through ERC-1271 below.
  }

  const bytecode = await client.getBytecode({ address: provider });
  if (!bytecode || bytecode === "0x") {
    throw new Error("ERC-8183 provider_sig is not valid for the ERC-8004 agent wallet");
  }

  const magic = await client.readContract({
    address: provider,
    abi: erc1271Abi,
    functionName: "isValidSignature",
    args: [hashMessage(envelope.negotiation_hash), envelope.provider_sig as Hex],
    account: verifier,
  });
  if (String(magic).toLowerCase() !== ERC1271_MAGIC_VALUE) {
    throw new Error("ERC-1271 provider account rejected the ERC-8183 provider_sig");
  }

  return { method: "erc1271", signer: provider, blockNumber: block.number };
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
