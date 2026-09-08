import { isAddress, keccak256, toHex, type Address, type Hex } from "viem";
import type { SupportedCommerceChainId } from "@/lib/erc8183";

export const MAX_ERC8183_DESCRIPTION_BYTES = 4096;

export interface CanonicalNegotiationEnvelope extends Record<string, unknown> {
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  negotiation_hash: Hex;
  provider_sig: Hex;
  chain_id: SupportedCommerceChainId;
  verifying_contract: Address;
  provider_address?: Address;
}

export interface ParsedCanonicalQuote {
  envelope: CanonicalNegotiationEnvelope;
  providerAddress: Address | null;
  priceBaseUnits: string;
  paymentToken: Address;
  quoteExpiresAtSeconds: number | null;
  negotiatedAtSeconds: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integerField(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function canonicalValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalValue(entry ?? null)).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalValue(object[key])}`)
      .join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Unsupported value in canonical ERC-8183 JSON");
  return encoded;
}

export function canonicalJson(value: unknown): string {
  return canonicalValue(value);
}

export function sanitizeForClaim(value: unknown): string {
  const input = typeof value === "string" ? value : String(value ?? "");
  let output = "";
  for (const character of input.replaceAll("[", "(").replaceAll("]", ")")) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x20 || character === "\t" || character === "\n") output += character;
  }
  return output;
}

function successCriteria(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const criteria = value
    .filter((item): item is string => typeof item === "string")
    .map(sanitizeForClaim)
    .filter(Boolean);
  return criteria.length ? criteria : null;
}

export function canonicalSignedContent(envelope: CanonicalNegotiationEnvelope): Record<string, unknown> {
  const request = envelope.request;
  const response = envelope.response;
  if (response.accepted !== true) throw new Error("ERC-8183 negotiation was not accepted");

  const terms = record(response.terms);
  if (!terms) throw new Error("Accepted ERC-8183 quote is missing response.terms");

  const price = stringField(terms.price);
  const currency = stringField(terms.currency);
  if (!price || !/^\d+$/.test(price)) throw new Error("ERC-8183 quote price must be integer base units");
  if (!currency || !isAddress(currency)) throw new Error("ERC-8183 quote currency must be a payment-token address");

  const negotiatedAt = integerField(envelope.negotiated_at)
    ?? integerField(response.negotiated_at);
  if (negotiatedAt === null || negotiatedAt <= 0) {
    throw new Error("Signed ERC-8183 quote is missing negotiated_at");
  }

  const quoteExpiresAt = integerField(envelope.quote_expires_at)
    ?? integerField(response.quote_expires_at);

  const signedTerms: Record<string, unknown> = {
    deliverables: sanitizeForClaim(terms.deliverables ?? ""),
    quality_standards: sanitizeForClaim(terms.quality_standards ?? ""),
  };
  const criteria = successCriteria(terms.success_criteria);
  if (criteria) signedTerms.success_criteria = criteria;

  const content: Record<string, unknown> = {
    version: 1,
    negotiated_at: negotiatedAt,
    task: sanitizeForClaim(request.task_description ?? ""),
    terms: signedTerms,
    price,
    currency,
  };
  if (quoteExpiresAt !== null) content.quote_expires_at = quoteExpiresAt;
  content.chain_id = envelope.chain_id;
  content.verifying_contract = envelope.verifying_contract;
  return content;
}

export function recomputeNegotiationHash(envelope: CanonicalNegotiationEnvelope): Hex {
  return keccak256(toHex(canonicalJson(canonicalSignedContent(envelope))));
}

export function buildCanonicalJobDescription(envelope: CanonicalNegotiationEnvelope): string {
  const content = canonicalSignedContent(envelope);
  content.negotiation_hash = envelope.negotiation_hash;
  content.provider_sig = envelope.provider_sig;
  const description = canonicalJson(content);
  if (new TextEncoder().encode(description).byteLength > MAX_ERC8183_DESCRIPTION_BYTES) {
    throw new Error(`Canonical ERC-8183 job description exceeds ${MAX_ERC8183_DESCRIPTION_BYTES} bytes`);
  }
  return description;
}

function unwrapEnvelope(value: unknown): Record<string, unknown> | null {
  const root = record(value);
  if (!root) return null;

  if (record(root.request) && record(root.response)) return root;

  const result = record(root.result);
  if (result && record(result.request) && record(result.response)) return result;

  const data = record(root.data);
  if (data && record(data.request) && record(data.response)) return data;

  return null;
}

export function parseCanonicalNegotiationEnvelope(value: unknown): ParsedCanonicalQuote {
  const raw = unwrapEnvelope(value);
  if (!raw) throw new Error("ERC-8183 service did not return a canonical signed negotiation envelope");

  const request = record(raw.request);
  const response = record(raw.response);
  if (!request || !response) throw new Error("ERC-8183 quote is missing request/response sections");
  if (response.accepted !== true) {
    const reason = stringField(response.reason) ?? "Agent declined this ERC-8183 hire request";
    throw new Error(reason);
  }

  const terms = record(response.terms);
  if (!terms) throw new Error("Accepted ERC-8183 quote is missing response.terms");

  const price = stringField(terms.price);
  if (!price || !/^\d+$/.test(price) || BigInt(price) <= BigInt(0)) {
    throw new Error("ERC-8183 quote price must be positive integer base units");
  }

  const currency = stringField(terms.currency);
  if (!currency || !isAddress(currency)) throw new Error("ERC-8183 quote currency is not a valid token address");

  const chainId = integerField(raw.chain_id);
  if (chainId !== 56 && chainId !== 97) throw new Error("ERC-8183 quote is not bound to BNB Smart Chain mainnet/testnet");

  const verifyingContract = stringField(raw.verifying_contract);
  if (!verifyingContract || !isAddress(verifyingContract)) {
    throw new Error("ERC-8183 quote is not bound to a valid verifying_contract");
  }

  const negotiationHash = stringField(raw.negotiation_hash);
  if (!negotiationHash || !/^0x[0-9a-fA-F]{64}$/.test(negotiationHash)) {
    throw new Error("ERC-8183 quote is missing a valid negotiation_hash");
  }

  const providerSig = stringField(raw.provider_sig);
  if (!providerSig || !/^0x(?:[0-9a-fA-F]{2})+$/.test(providerSig)) {
    throw new Error("ERC-8183 quote is missing a valid provider_sig");
  }

  const providerAddress = stringField(raw.provider_address);
  if (providerAddress && !isAddress(providerAddress)) throw new Error("ERC-8183 quote returned an invalid provider_address");

  const envelope: CanonicalNegotiationEnvelope = {
    ...raw,
    request,
    response,
    negotiation_hash: negotiationHash as Hex,
    provider_sig: providerSig as Hex,
    chain_id: chainId,
    verifying_contract: verifyingContract as Address,
    ...(providerAddress ? { provider_address: providerAddress as Address } : {}),
  };

  const negotiatedAt = integerField(raw.negotiated_at) ?? integerField(response.negotiated_at);
  if (negotiatedAt === null || negotiatedAt <= 0) throw new Error("Signed ERC-8183 quote is missing negotiated_at");

  const quoteExpiresAt = integerField(raw.quote_expires_at) ?? integerField(response.quote_expires_at);

  return {
    envelope,
    providerAddress: providerAddress ? providerAddress as Address : null,
    priceBaseUnits: price,
    paymentToken: currency as Address,
    quoteExpiresAtSeconds: quoteExpiresAt,
    negotiatedAtSeconds: negotiatedAt,
  };
}

export function signedTaskContainsReceipt(envelope: CanonicalNegotiationEnvelope, receiptHash: string): boolean {
  const task = typeof envelope.request.task_description === "string" ? envelope.request.task_description : "";
  return task.toLowerCase().includes(receiptHash.toLowerCase());
}
