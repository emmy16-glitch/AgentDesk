const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "follow", cache: "no-store" });
  const body = await response.json();
  return { response, body };
}

async function main() {
  const health = await json("/api/health/");
  assert(health.response.status === 200, `health returned HTTP ${health.response.status}`);
  assert(health.body?.ok === true && health.body?.status === "alive", "health response is not an alive liveness proof");
  assert(health.response.headers.get("x-agentdesk-proof-boundary") === "liveness-only", "health proof-boundary header is missing");
  assert(String(health.body?.proofBoundary || "").includes("Liveness only"), "health response does not explain its proof boundary");

  const home = await fetch(`${baseUrl}/`, { redirect: "follow", cache: "no-store" });
  assert(home.status === 200, `homepage returned HTTP ${home.status}`);
  assert(home.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options is not hardened");
  assert(home.headers.get("x-frame-options") === "DENY", "X-Frame-Options is not hardened");
  assert(home.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy is not hardened");
  assert(home.headers.get("x-powered-by") === null, "framework identification header is still exposed");

  const manifest = await json("/manifest.webmanifest");
  assert(manifest.response.status === 200, `manifest returned HTTP ${manifest.response.status}`);
  assert(manifest.body?.name === "AgentDesk" && manifest.body?.start_url === "/", "manifest identity/start URL is invalid");

  const readiness = await json("/api/readiness/");
  assert([200, 503].includes(readiness.response.status), `readiness returned unexpected HTTP ${readiness.response.status}`);
  assert(typeof readiness.body?.ok === "boolean", "readiness response is missing boolean ok state");
  assert(typeof readiness.body?.proofBoundary === "string" && readiness.body.proofBoundary.length > 20, "readiness proof boundary is missing");
  assert(readiness.body?.checks?.erc8004IdentityRegistry?.address === "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", "readiness is not checking the canonical BSC ERC-8004 Identity Registry");
  if (readiness.response.status === 200) {
    assert(readiness.body.ok === true && readiness.body.checks?.erc8004IdentityRegistry?.ok === true, "HTTP 200 readiness did not prove registry bytecode");
  } else {
    assert(readiness.body.ok === false, "HTTP 503 readiness was incorrectly marked ready");
  }

  console.log(JSON.stringify({
    ok: true,
    checks: ["liveness", "security-headers", "manifest", "bounded-readiness"],
    readinessStatus: readiness.response.status,
    readinessProof: readiness.body?.proofBoundary,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[production-smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
