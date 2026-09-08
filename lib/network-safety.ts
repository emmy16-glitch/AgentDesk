import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export async function validatePublicHttpsUrl(input: string): Promise<
  | { ok: true; url: URL }
  | { ok: false; reason: string }
> {
  if (!input || input.length > 2048) return { ok: false, reason: "URL is empty or too long" };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "URL is invalid" };
  }

  if (url.protocol !== "https:") return { ok: false, reason: "Only public HTTPS URLs are allowed" };
  if (url.username || url.password) return { ok: false, reason: "Credential-bearing URLs are blocked" };
  if (url.port && url.port !== "443") return { ok: false, reason: "Non-standard HTTPS ports are blocked" };

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { ok: false, reason: "Local/private hostnames are blocked" };
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    return { ok: false, reason: "Private/reserved IP addresses are blocked" };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      return { ok: false, reason: "Hostname resolves to a private/reserved address" };
    }
  } catch {
    return { ok: false, reason: "Hostname could not be resolved" };
  }

  return { ok: true, url };
}
