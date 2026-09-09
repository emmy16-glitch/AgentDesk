import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MCP_URL = "https://camber-mcp.cambercloud.com/mcp";

function parseResourceMetadata(wwwAuthenticate: string | null): string | null {
  if (!wwwAuthenticate) return null;
  const match = wwwAuthenticate.match(/resource_metadata="([^"]+)"/i);
  return match?.[1] ?? null;
}

async function safeJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    const text = await response.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch {}
    return { status: response.status, json, text: json ? undefined : text.slice(0, 1000) };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message : "fetch failed" };
  }
}

export async function GET() {
  try {
    const probe = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "agentdesk-oauth-discovery", version: "0.1.0" },
        },
      }),
      cache: "no-store",
      redirect: "manual",
    });

    const wwwAuthenticate = probe.headers.get("www-authenticate");
    const resourceMetadataUrl = parseResourceMetadata(wwwAuthenticate);
    const resourceMetadata = resourceMetadataUrl ? await safeJson(resourceMetadataUrl) : null;

    const metadataObject = resourceMetadata?.json && typeof resourceMetadata.json === "object" && !Array.isArray(resourceMetadata.json)
      ? resourceMetadata.json as Record<string, unknown>
      : null;
    const authorizationServers = Array.isArray(metadataObject?.authorization_servers)
      ? metadataObject.authorization_servers.filter((value): value is string => typeof value === "string")
      : [];

    const authorizationMetadata = [];
    for (const issuer of authorizationServers.slice(0, 3)) {
      const base = issuer.replace(/\/$/, "");
      const oauth = await safeJson(`${base}/.well-known/oauth-authorization-server`);
      const oidc = oauth.status === 200 ? null : await safeJson(`${base}/.well-known/openid-configuration`);
      authorizationMetadata.push({ issuer, oauth, oidc });
    }

    return NextResponse.json({
      ok: true,
      mcpStatus: probe.status,
      wwwAuthenticate,
      resourceMetadataUrl,
      resourceMetadata,
      authorizationMetadata,
      note: "OAuth discovery metadata only. No credentials or tokens are returned.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "OAuth discovery failed",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
