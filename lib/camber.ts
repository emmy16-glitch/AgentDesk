import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const maxHistoryTurns = 6;

type ConversationTurn = { role: "user" | "assistant"; content: string };
type Conversation = { agentId: string; turns: ConversationTurn[] };

const conversations = new Map<string, Conversation>();

export class CamberError extends Error {}

function parseJson(output: string): Record<string, unknown> {
  const candidates = output.trim().split("\n").filter(Boolean).reverse();

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // Camber may write progress lines before its JSON response.
    }
  }

  throw new CamberError("Camber returned invalid JSON.");
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getAnswer(payload: Record<string, unknown>): string | undefined {
  const direct = [payload.answer, payload.message, payload.response, payload.output]
    .map(getString)
    .find(Boolean);
  if (direct) return direct;

  const data = payload.data;
  if (data && typeof data === "object" && !Array.isArray(data)) return getAnswer(data as Record<string, unknown>);
}

function getConversationId(payload: Record<string, unknown>): string | undefined {
  return [payload.conversationId, payload.conversation_id, payload.id].map(getString).find(Boolean);
}

function buildMessage(message: string, conversation?: Conversation): string {
  if (!conversation?.turns.length) return message;

  const history = conversation.turns
    .slice(-maxHistoryTurns)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n");

  return `Conversation context:\n${history}\n\nUser follow-up: ${message}`;
}

function resolveCamberCliPath() {
  const explicit = process.env.CAMBER_CLI_PATH?.trim();
  if (explicit) return explicit;

  const officialUserInstall = path.join(os.homedir(), ".camber", "bin", "camber");
  if (existsSync(officialUserInstall)) return officialUserInstall;

  return "camber";
}

export async function chatWithCamber({
  agentId,
  agentTag,
  message,
  conversationId,
}: {
  agentId: string;
  agentTag: string;
  message: string;
  conversationId?: string;
}) {
  const token = process.env.CAMBER_API_KEY?.trim() || process.env.CAMBER_TOKEN?.trim();
  if (!token) throw new CamberError("Camber API credentials are not configured.");

  const previousConversation = conversationId ? conversations.get(conversationId) : undefined;
  const prompt = buildMessage(message, previousConversation?.agentId === agentId ? previousConversation : undefined);
  const cliPath = resolveCamberCliPath();

  try {
    const { stdout } = await execFileAsync(
      cliPath,
      ["chat", "--agent", agentTag, "--message", prompt, "--output", "json"],
      {
        timeout: 30_000,
        maxBuffer: 1_024 * 1_024,
        env: { ...process.env, CAMBER_API_KEY: token },
      },
    );
    const payload = parseJson(stdout);
    const answer = getAnswer(payload);
    if (!answer) throw new CamberError("Camber returned an empty answer.");

    const resolvedConversationId = getConversationId(payload) ?? conversationId ?? randomUUID();
    const existing = previousConversation?.agentId === agentId ? previousConversation.turns : [];
    const turns: ConversationTurn[] = [...existing, { role: "user", content: message }, { role: "assistant", content: answer }];
    conversations.set(resolvedConversationId, { agentId, turns: turns.slice(-maxHistoryTurns) });

    return { answer, conversationId: resolvedConversationId };
  } catch (error) {
    if (error instanceof CamberError) throw error;
    throw new CamberError("Camber could not be reached. The deterministic AgentDesk Brain fallback should remain available.");
  }
}
