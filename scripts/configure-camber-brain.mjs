import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const bundle = path.join(root, "camber", "agentdesk-brain");
const tag = process.env.CAMBER_BRAIN_AGENT_TAG?.trim();
const apiKey = process.env.CAMBER_API_KEY?.trim() || process.env.CAMBER_TOKEN?.trim();
const officialUserInstall = path.join(os.homedir(), ".camber", "bin", "camber");
const cli = process.env.CAMBER_CLI_PATH?.trim()
  || (existsSync(officialUserInstall) ? officialUserInstall : "camber");

if (!tag) {
  console.error("CAMBER_BRAIN_AGENT_TAG is required, e.g. @owner.agentdesk-brain");
  process.exit(1);
}
if (!apiKey) {
  console.error("CAMBER_API_KEY (or legacy CAMBER_TOKEN) is required for authenticated Camber CLI access");
  process.exit(1);
}

const env = { ...process.env, CAMBER_API_KEY: apiKey };

async function run(args, options = {}) {
  const { stdout, stderr } = await execFileAsync(cli, args, {
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    env,
    ...options,
  });
  if (stderr?.trim()) process.stderr.write(stderr);
  return stdout.trim();
}

function lastJson(text) {
  const lines = text.split("\n").filter(Boolean).reverse();
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  try { return JSON.parse(text); } catch { return null; }
}

const tempParent = await mkdtemp(path.join(os.tmpdir(), "agentdesk-camber-brain-"));
try {
  console.log(`Checking Camber CLI at ${cli}...`);
  await run(["version"]);
  console.log("Checking authenticated Camber account...");
  await run(["me", "--output", "json"]);

  console.log(`Updating ${tag} instructions and structured-output mode...`);
  await run([
    "agent", "update", tag,
    "--name", "AgentDesk Brain",
    "--description", "Evidence analyst for AgentDesk BNB agent auditions. Explains proof without creating it.",
    "--instructions-file", path.join(bundle, "instruction.md"),
    "--structured-output=true",
    "--output", "json",
  ]);

  console.log("Pulling the current Context Mirror before applying the source-controlled bundle...");
  const pullOutput = await run([
    "agent", "pull", tag,
    "--integrate", "claude-code",
    "--dest", tempParent,
    "--output", "json",
  ]);
  const pulled = lastJson(pullOutput);
  const mirrorRoot = typeof pulled?.dest === "string" ? pulled.dest : null;
  if (!mirrorRoot) throw new Error(`Could not resolve pulled mirror path from Camber output: ${pullOutput}`);

  await cp(path.join(bundle, "README.md"), path.join(mirrorRoot, "README.md"), { force: true });
  await cp(path.join(bundle, "instruction.md"), path.join(mirrorRoot, "instruction.md"), { force: true });
  await rm(path.join(mirrorRoot, "knowledge-base"), { recursive: true, force: true });
  await cp(path.join(bundle, "knowledge-base"), path.join(mirrorRoot, "knowledge-base"), { recursive: true });
  await rm(path.join(mirrorRoot, "schema"), { recursive: true, force: true });
  await cp(path.join(bundle, "schema"), path.join(mirrorRoot, "schema"), { recursive: true });

  // Keep the account-side skill set deterministic: remove any stale mirror skills
  // before copying the four source-controlled AgentDesk category skills.
  const skillTarget = path.join(mirrorRoot, ".claude", "skills");
  await rm(skillTarget, { recursive: true, force: true });
  await cp(path.join(bundle, "skills"), skillTarget, { recursive: true });

  // Preserve Camber's generated sync metadata, but make sure instructions stay enabled.
  const syncPath = path.join(mirrorRoot, ".camber", "sync.yaml");
  const syncText = await readFile(syncPath, "utf8");
  if (!/instruction:\s*[\s\S]*?enabled:\s*true/.test(syncText)) {
    await writeFile(syncPath, `${syncText.trim()}\n\ninstruction:\n  enabled: true\n  path: instruction.md\n`, "utf8");
  }

  console.log("Pushing AgentDesk Brain instructions, knowledge, schema and category skills as a stable Camber version...");
  const pushOutput = await run(["agent", "push", "--output", "json"], { cwd: mirrorRoot });
  console.log(pushOutput || "Camber Brain push completed.");
  console.log(`AgentDesk Brain synced: ${tag}`);
} finally {
  await rm(tempParent, { recursive: true, force: true });
}
