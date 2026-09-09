import { randomUUID } from "node:crypto";

const maxHistoryTurns = 6;
const defaultMcpUrl = "https://camber-mcp.cambercloud.com/mcp";
const mcpProtocolVersion = "2025-06-18";
const maxResponseBytes = 2_000_000;
const requestTimeoutMs = 10_000;
const chatDeadlineMs = 28_000;

type ConversationTurn = { role: "user" | "assistant"; content: string };
type Conversation = { agentId: string; turns: ConversationTurn[] };
type JsonObject = Record<string, unknown>;
type RpcError = { code?: number; message?: string; data?: unknown };
type RpcEnvelope = { result?: unknown; error?: RpcError };

type McpResponse = {
  envelope: RpcEnvelope | null;
  sessionId?: string;
};

const conversations = new Map<string, Conversation>();

export class CamberError extends Error {}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseJsonObject(value: string): JsonObject | null {
  try {
    return asObject(JSON.parse(value));
  } catch {
    return null;
  }
}

function parseRpcEnvelope(text: string, contentType: string): RpcEnvelope | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (contentType.includes("text/event-stream") || trimmed.startsWith("event:") || trimmed.startsWith("data:")) {
    const dataLines = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== "[DONE]")
      .reverse();

    for (const line of dataLines) {
      const parsed = parseJsonObject(line);
      if (parsed && ("result" in parsed || "error" in parsed)) return parsed as RpcEnvelope;
    }
    return null;
  }

  const parsed = parseJsonObject(trimmed);
  return parsed && ("result" in parsed || "error" in parsed) ? parsed as RpcEnvelope : null;
}

function rpcErrorMessage(error: RpcError | undefined): string {
  return getString(error?.message) ?? "Camber MCP returned an error.";
}

async function mcpPost({
  token,
  url,
  method,
  params,
  id,
  sessionId,
  timeoutMs = requestTimeoutMs,
}: {
  token: string;
  url: string;
  method: string;
  params?: JsonObject;
  id?: number;
  sessionId?: string;
  timeoutMs?: number;
}): Promise<McpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": mcpProtocolVersion,
    };
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    const body: JsonObject = {
      jsonrpc: "2.0",
      method,
      ...(params ? { params } : {}),
      ...(id === undefined ? {} : { id }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();
    if (text.length > maxResponseBytes) throw new CamberError("Camber MCP response exceeded the safety limit.");
    if (!response.ok) {
      throw new CamberError(`Camber MCP request failed with HTTP ${response.status}.`);
    }

    const envelope = parseRpcEnvelope(text, response.headers.get("content-type") ?? "");
    if (envelope?.error) throw new CamberError(rpcErrorMessage(envelope.error));

    return {
      envelope,
      sessionId: response.headers.get("mcp-session-id") ?? sessionId ?? undefined,
    };
  } catch (error) {
    if (error instanceof CamberError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new CamberError("Camber MCP timed out.");
    throw new CamberError("Camber MCP could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

function getToolNames(result: unknown): Set<string> {
  const object = asObject(result);
  const tools = Array.isArray(object?.tools) ? object.tools : [];
  return new Set(tools.flatMap((tool) => {
    const name = getString(asObject(tool)?.name);
    return name ? [name] : [];
  }));
}

function toolText(result: unknown): string | undefined {
  const object = asObject(result);
  const content = Array.isArray(object?.content) ? object.content : [];
  const text = content.flatMap((entry) => {
    const block = asObject(entry);
    return block?.type === "text" && getString(block.text) ? [getString(block.text)!] : [];
  }).join("\n").trim();
  return text || undefined;
}

function unwrapToolResult(result: unknown): JsonObject {
  const object = asObject(result);
  if (!object) return { answer: String(result ?? "") };

  if (object.isError === true) {
    throw new CamberError(toolText(object) ?? "Camber agent call failed.");
  }

  const structured = asObject(object.structuredContent);
  if (structured) return structured;

  const text = toolText(object);
  if (text) return parseJsonObject(text) ?? { answer: text };

  return object;
}

function getAnswer(payload: JsonObject): string | undefined {
  const direct = [payload.answer, payload.message, payload.response, payload.output, payload.content]
    .map(getString)
    .find(Boolean);
  if (direct) return direct;

  for (const key of ["data", "result", "analysis"]) {
    const nested = asObject(payload[key]);
    if (nested) {
      const answer = getAnswer(nested);
      if (answer) return answer;
    }
  }
}

function getConversationId(payload: JsonObject): string | undefined {
  const direct = [payload.conversationId, payload.conversation_id, payload.id].map(getString).find(Boolean);
  if (direct) return direct;

  for (const key of ["data", "result"]) {
    const nested = asObject(payload[key]);
    if (nested) {
      const conversationId = getConversationId(nested);
      if (conversationId) return conversationId;
    }
  }
}

function getStatus(payload: JsonObject): string | undefined {
  const direct = [payload.status, payload.state].map(getString).find(Boolean);
  if (direct) return direct.toLowerCase();

  for (const key of ["data", "result"]) {
    const nested = asObject(payload[key]);
    if (nested) {
      const status = getStatus(nested);
      if (status) return status;
    }
  }
}

function buildMessage(message: string, conversation?: Conversation): string {
  if (!conversation?.turns.length) return message;

  const history = conversation.turns
    .slice(-maxHistoryTurns)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n");

  return `Conversation context:\n${history}\n\nUser follow-up: ${message}`;
}

async function openMcpSession(token: string, url: string) {
  let rpcId = 1;
  const initialized = await mcpPost({
    token,
    url,
    method: "initialize",
    id: rpcId++,
    params: {
      protocolVersion: mcpProtocolVersion,
      capabilities: {},
      clientInfo: { name: "agentdesk", version: "0.1.0" },
    },
  });

  if (!initialized.envelope?.result) throw new CamberError("Camber MCP did not complete initialization.");
  const sessionId = initialized.sessionId;

  await mcpPost({
    token,
    url,
    method: "notifications/initialized",
    params: {},
    sessionId,
    timeoutMs: 5_000,
  });

  const listed = await mcpPost({
    token,
    url,
    method: "tools/list",
    params: {},
    id: rpcId++,
    sessionId,
  });

  return {
    sessionId: listed.sessionId ?? sessionId,
    rpcId,
    tools: getToolNames(listed.envelope?.result),
  };
}

async function callTool({
  token,
  url,
  sessionId,
  id,
  name,
  args,
  timeoutMs,
}: {
  token: string;
  url: string;
  sessionId?: string;
  id: number;
  name: string;
  args: JsonObject;
  timeoutMs?: number;
}) {
  const response = await mcpPost({
    token,
    url,
    method: "tools/call",
    params: { name, arguments: args },
    id,
    sessionId,
    timeoutMs,
  });
  if (!response.envelope?.result) throw new CamberError(`Camber tool ${name} returned no result.`);
  return {
    sessionId: response.sessionId,
    payload: unwrapToolResult(response.envelope.result),
  };
}

async function chatViaMcp({
  token,
  url,
  agentTag,
  prompt,
}: {
  token: string;
  url: string;
  agentTag: string;
  prompt: string;
}) {
  const session = await openMcpSession(token, url);
  let rpcId = session.rpcId;
  let sessionId = session.sessionId;
  const deadline = Date.now() + chatDeadlineMs;

  if (session.tools.has("agents_chat")) {
    const args: JsonObject = { agent_tag: agentTag, message: prompt };
    const model = process.env.CAMBER_BRAIN_MODEL?.trim();
    if (model) args.model_id = model;

    const response = await callTool({
      token,
      url,
      sessionId,
      id: rpcId++,
      name: "agents_chat",
      args,
      timeoutMs: Math.max(5_000, deadline - Date.now()),
    });
    const answer = getAnswer(response.payload);
    if (!answer) throw new CamberError("Camber agent returned an empty answer.");
    return { answer, conversationId: getConversationId(response.payload) };
  }

  if (!session.tools.has("agents_chat_start") || !session.tools.has("agents_chat_status")) {
    throw new CamberError("Camber MCP does not expose a supported agent chat tool.");
  }

  const started = await callTool({
    token,
    url,
    sessionId,
    id: rpcId++,
    name: "agents_chat_start",
    args: { agent_tag: agentTag, message: prompt, stop: false },
    timeoutMs: Math.min(8_000, Math.max(3_000, deadline - Date.now())),
  });
  sessionId = started.sessionId ?? sessionId;
  const remoteConversationId = getConversationId(started.payload);
  if (!remoteConversationId) throw new CamberError("Camber did not return a conversation id.");

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const remaining = deadline - Date.now();
    if (remaining <= 1_000) break;

    const checked = await callTool({
      token,
      url,
      sessionId,
      id: rpcId++,
      name: "agents_chat_status",
      args: { conversation_id: remoteConversationId },
      timeoutMs: Math.min(7_000, Math.max(2_000, remaining)),
    });
    sessionId = checked.sessionId ?? sessionId;
    const status = getStatus(checked.payload);

    if (status === "failed") throw new CamberError(getAnswer(checked.payload) ?? "Camber agent run failed.");
    if (status === "idle" || status === "completed" || status === "done") {
      const answer = getAnswer(checked.payload);
      if (!answer) throw new CamberError("Camber agent completed without an answer.");
      return { answer, conversationId: remoteConversationId };
    }
  }

  throw new CamberError("Camber agent did not finish within the AgentDesk response window.");
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

  const url = process.env.CAMBER_MCP_URL?.trim() || defaultMcpUrl;
  if (!url.startsWith("https://")) throw new CamberError("Camber MCP URL must use HTTPS.");

  const previousConversation = conversationId ? conversations.get(conversationId) : undefined;
  const prompt = buildMessage(message, previousConversation?.agentId === agentId ? previousConversation : undefined);

  try {
    const response = await chatViaMcp({ token, url, agentTag, prompt });
    const resolvedConversationId = response.conversationId ?? conversationId ?? randomUUID();
    const existing = previousConversation?.agentId === agentId ? previousConversation.turns : [];
    const turns: ConversationTurn[] = [
      ...existing,
      { role: "user", content: message },
      { role: "assistant", content: response.answer },
    ];
    conversations.set(resolvedConversationId, { agentId, turns: turns.slice(-maxHistoryTurns) });

    return { answer: response.answer, conversationId: resolvedConversationId };
  } catch (error) {
    if (error instanceof CamberError) throw error;
    throw new CamberError("Camber could not be reached. The deterministic AgentDesk Brain fallback should remain available.");
  }
}
