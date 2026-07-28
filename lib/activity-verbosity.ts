/**
 * Bridge-owned Telegram activity verbosity projection
 * Zones: telegram activity, rich rendering, operational delivery
 * Owns ephemeral reasoning drafts and bounded durable tool disclosures; excludes activity normalization, assistant answer rendering, and transport authority policy
 */

import type { TelegramActivityEvent } from "./activity.ts";
import { escapeHtml } from "./rendering.ts";
import type {
  TelegramEditMessageTextBody,
  TelegramRichText,
  TelegramSendMessageBody,
  TelegramSendRichMessageDraftBody,
  TelegramSentMessage,
} from "./telegram-api.ts";
import type { TelegramTarget } from "./target.ts";

export const TELEGRAM_TOOL_ACTIVITY_ICON = "🛠";
export const TELEGRAM_ACTIVITY_DETAIL_MAX_CHARS = 1_200;
export const TELEGRAM_ACTIVITY_MESSAGE_MAX_CHARS = 3_900;
export const TELEGRAM_ACTIVITY_MESSAGE_MAX_TOOLS = 6;
export const TELEGRAM_REASONING_DRAFT_MAX_FRAMES = 24;
export const TELEGRAM_REASONING_BUFFER_MAX_CHARS = 1_200;
export const TELEGRAM_TOOL_UPDATE_MAX_ENTRIES = 4;

interface ToolActivity {
  id: string;
  name: string;
  args: string;
  updates: string[];
  droppedUpdates: number;
  result?: string;
  isError?: boolean;
  complete: boolean;
}

interface ToolMessage {
  messageId: number;
  tools: ToolActivity[];
  target: TelegramTarget;
}

function targetEquals(left: TelegramTarget, right: TelegramTarget): boolean {
  return left.chatId === right.chatId && left.threadId === right.threadId;
}

function redactActivityText(text: string): string {
  return text
    .replace(/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/g, "[REDACTED_BOT_TOKEN]")
    .replace(
      /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}\b/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(["']?(?:api[_-]?key|token|password|secret)["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
      "$1[REDACTED]",
    );
}

function renderReasoningRichText(text: string): TelegramRichText {
  const parts: TelegramRichText[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const codeStart = text.indexOf("`", cursor);
    const boldStart = text.indexOf("**", cursor);
    const starts = [codeStart, boldStart].filter((index) => index >= 0);
    if (starts.length === 0) {
      parts.push(text.slice(cursor));
      break;
    }
    const start = Math.min(...starts);
    if (start > cursor) parts.push(text.slice(cursor, start));
    const marker = start === codeStart ? "`" : "**";
    const end = text.indexOf(marker, start + marker.length);
    if (end < 0) {
      parts.push(text.slice(start));
      break;
    }
    parts.push({
      type: marker === "`" ? "code" : "bold",
      text: text.slice(start + marker.length, end),
    });
    cursor = end + marker.length;
  }
  if (parts.length === 0) return "";
  return parts.length === 1 ? parts[0]! : parts;
}

function formatActivityJson(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}[]`];
    if (
      value.every(
        (entry) =>
          entry !== null && typeof entry === "object" && !Array.isArray(entry),
      )
    ) {
      const lines = [`${indent}[{`];
      value.forEach((entry, index) => {
        const fields = Object.entries(entry as Record<string, unknown>);
        fields.forEach(([key, nested], fieldIndex) => {
          const nestedLines = formatActivityJson(nested, depth + 1);
          const nestedIndent = "  ".repeat(depth + 1);
          lines.push(
            `${nestedIndent}${JSON.stringify(key)}: ${nestedLines[0]!.slice(nestedIndent.length)}`,
            ...nestedLines.slice(1),
          );
          if (fieldIndex < fields.length - 1) {
            lines[lines.length - 1] += ",";
          }
        });
        lines.push(
          index < value.length - 1 ? `${indent}}, {` : `${indent}}]`,
        );
      });
      return lines;
    }
    const lines = [`${indent}[`];
    value.forEach((entry, index) => {
      const nestedLines = formatActivityJson(entry, depth + 1);
      if (index < value.length - 1) {
        nestedLines[nestedLines.length - 1] += ",";
      }
      lines.push(...nestedLines);
    });
    lines.push(`${indent}]`);
    return lines;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [`${indent}{}`];
    const lines = [`${indent}{`];
    entries.forEach(([key, nested], index) => {
      const nestedLines = formatActivityJson(nested, depth + 1);
      const nestedIndent = "  ".repeat(depth + 1);
      lines.push(
        `${nestedIndent}${JSON.stringify(key)}: ${nestedLines[0]!.slice(nestedIndent.length)}`,
        ...nestedLines.slice(1),
      );
      if (index < entries.length - 1) lines[lines.length - 1] += ",";
    });
    lines.push(`${indent}}`);
    return lines;
  }
  return [`${indent}${JSON.stringify(value)}`];
}

function serializeActivityValue(value: unknown): string {
  const seen = new WeakSet<object>();
  let text: string;
  try {
    const normalized =
      JSON.stringify(
        value,
        (_key, nested) => {
          if (typeof nested === "bigint") return nested.toString();
          if (nested && typeof nested === "object") {
            if (seen.has(nested)) return "[Circular]";
            seen.add(nested);
          }
          return nested;
        },
      ) ?? JSON.stringify(String(value));
    text = formatActivityJson(JSON.parse(normalized)).join("\n");
  } catch {
    text = JSON.stringify(String(value));
  }
  const redacted = redactActivityText(text);
  if (redacted.length <= TELEGRAM_ACTIVITY_DETAIL_MAX_CHARS) return redacted;
  const omitted = redacted.length - TELEGRAM_ACTIVITY_DETAIL_MAX_CHARS;
  return `${redacted.slice(0, TELEGRAM_ACTIVITY_DETAIL_MAX_CHARS)}\n… [${omitted} chars truncated]`;
}

function renderToolActivityHtml(tool: ToolActivity): string {
  const evidence = [`"arguments": ${tool.args}`];
  if (tool.droppedUpdates > 0) {
    evidence.push(`… [${tool.droppedUpdates} earlier updates omitted]`);
  }
  tool.updates.forEach((update, index) => {
    evidence.push(
      `"update ${tool.droppedUpdates + index + 1}": ${update}`,
    );
  });
  if (tool.complete && tool.result !== undefined) {
    evidence.push(`"${tool.isError ? "error" : "result"}": ${tool.result}`);
  }
  const status = tool.complete
    ? tool.isError
      ? "failed"
      : "done"
    : "running";
  return [
    `<b>${TELEGRAM_TOOL_ACTIVITY_ICON}&#160; ${escapeHtml(tool.name)}:</b> <code>${status}</code>`,
    `<blockquote expandable>${escapeHtml(evidence.join("\n\n"))}</blockquote>`,
  ].join("\n");
}

export function renderTelegramToolActivityHtml(
  tools: readonly ToolActivity[],
): string {
  return tools.map(renderToolActivityHtml).join("\n\n");
}

function toolMessageSize(tools: readonly ToolActivity[]): number {
  return renderTelegramToolActivityHtml(tools).length;
}

function draftIdForActivity(activityId: string): number {
  let hash = 2166136261;
  for (const character of activityId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export interface TelegramActivityVerbosityRuntime {
  accept: (event: TelegramActivityEvent) => void;
  reset: () => void;
  stop: () => void;
  waitForIdle: () => Promise<void>;
}

export function createTelegramActivityVerbosityRuntime<TAuthority>(deps: {
  isVerbose: () => boolean;
  resolveTarget: (event: TelegramActivityEvent) => TelegramTarget | undefined;
  captureAuthority: () => TAuthority;
  isAuthorityActive: (authority: TAuthority) => boolean;
  sendMessage: (body: TelegramSendMessageBody) => Promise<TelegramSentMessage>;
  sendRichMessageDraft: (
    body: TelegramSendRichMessageDraftBody,
  ) => Promise<boolean>;
  editMessageText: (
    body: TelegramEditMessageTextBody,
  ) => Promise<"edited" | "unchanged">;
  recordFailure?: (
    operation: "reasoning-draft" | "tool-send" | "tool-edit",
    event: TelegramActivityEvent,
    error: unknown,
  ) => void;
}): TelegramActivityVerbosityRuntime {
  let active = true;
  let generation = 0;
  let tail = Promise.resolve();
  let activityId: string | undefined;
  let authority: TAuthority | undefined;
  let target: TelegramTarget | undefined;
  let reasoningBuffer = "";
  let reasoningChars = 0;
  let reasoningDraftFrames = 0;
  let lastReasoningDraftChars = 0;
  let toolMessage: ToolMessage | undefined;
  const tools = new Map<string, ToolActivity>();
  const toolOrder: string[] = [];

  const clearActivity = () => {
    activityId = undefined;
    authority = undefined;
    target = undefined;
    reasoningBuffer = "";
    reasoningChars = 0;
    reasoningDraftFrames = 0;
    lastReasoningDraftChars = 0;
    toolMessage = undefined;
    tools.clear();
    toolOrder.length = 0;
  };
  const hasAuthority = (): boolean =>
    authority !== undefined && deps.isAuthorityActive(authority);
  const ensureActivity = (event: TelegramActivityEvent): boolean => {
    if (!deps.isVerbose()) return false;
    if (activityId === event.activityId) return hasAuthority();
    clearActivity();
    const resolvedTarget = deps.resolveTarget(event);
    if (!resolvedTarget) return false;
    activityId = event.activityId;
    target = { ...resolvedTarget };
    authority = deps.captureAuthority();
    return hasAuthority();
  };
  const closeToolBatch = () => {
    toolMessage = undefined;
  };
  const sendReasoningDraft = async (
    event: TelegramActivityEvent,
    acceptedGeneration: number,
  ) => {
    if (
      generation !== acceptedGeneration ||
      !target ||
      !hasAuthority()
    ) {
      return;
    }
    const omitted = reasoningChars - reasoningBuffer.length;
    const text =
      omitted > 0
        ? `… [${omitted} earlier chars omitted]\n${reasoningBuffer}`
        : reasoningBuffer;
    try {
      await deps.sendRichMessageDraft({
        chat_id: target.chatId,
        ...(target.threadId === undefined
          ? {}
          : { message_thread_id: target.threadId }),
        draft_id: draftIdForActivity(event.activityId),
        rich_message: {
          blocks: [
            {
              type: "thinking",
              text: renderReasoningRichText(redactActivityText(text)),
            },
          ],
          skip_entity_detection: true,
        },
      });
      if (generation !== acceptedGeneration) return;
      reasoningDraftFrames += 1;
      lastReasoningDraftChars = reasoningChars;
    } catch (error) {
      deps.recordFailure?.("reasoning-draft", event, error);
    }
  };
  const publishTool = async (
    event: TelegramActivityEvent,
    tool: ToolActivity,
    acceptedGeneration: number,
  ) => {
    if (
      generation !== acceptedGeneration ||
      !target ||
      !hasAuthority()
    ) {
      return;
    }
    const canAppend =
      toolMessage &&
      targetEquals(toolMessage.target, target) &&
      toolMessage.tools.length < TELEGRAM_ACTIVITY_MESSAGE_MAX_TOOLS &&
      toolMessageSize([...toolMessage.tools, tool]) <=
        TELEGRAM_ACTIVITY_MESSAGE_MAX_CHARS;
    try {
      if (canAppend && toolMessage) {
        const nextTools = [...toolMessage.tools, tool];
        await deps.editMessageText({
          chat_id: target.chatId,
          message_id: toolMessage.messageId,
          text: renderTelegramToolActivityHtml(nextTools),
          parse_mode: "HTML",
        });
        if (generation !== acceptedGeneration) return;
        toolMessage.tools = nextTools;
        return;
      }
      const sent = await deps.sendMessage({
        chat_id: target.chatId,
        ...(target.threadId === undefined
          ? {}
          : { message_thread_id: target.threadId }),
        text: renderTelegramToolActivityHtml([tool]),
        parse_mode: "HTML",
      });
      if (generation !== acceptedGeneration) return;
      toolMessage = {
        messageId: sent.message_id,
        tools: [tool],
        target: { ...target },
      };
    } catch (error) {
      deps.recordFailure?.(canAppend ? "tool-edit" : "tool-send", event, error);
      closeToolBatch();
    }
  };
  const process = async (
    event: TelegramActivityEvent,
    acceptedGeneration: number,
  ) => {
    if (!ensureActivity(event)) {
      if (activityId === event.activityId && !deps.isVerbose()) clearActivity();
      return;
    }
    if (
      event.type === "assistant-text-delta" ||
      event.type === "assistant-segment" ||
      event.type === "reasoning-delta" ||
      event.type === "reasoning-end"
    ) {
      closeToolBatch();
    }
    if (event.type === "reasoning-delta") {
      reasoningChars += event.delta.length;
      reasoningBuffer = `${reasoningBuffer}${event.delta}`.slice(
        -TELEGRAM_REASONING_BUFFER_MAX_CHARS,
      );
      if (
        reasoningDraftFrames < TELEGRAM_REASONING_DRAFT_MAX_FRAMES &&
        (reasoningDraftFrames === 0 ||
          reasoningChars - lastReasoningDraftChars >= 160)
      ) {
        await sendReasoningDraft(event, acceptedGeneration);
      }
      return;
    }
    if (event.type === "reasoning-end") {
      if (
        reasoningChars > lastReasoningDraftChars &&
        reasoningDraftFrames < TELEGRAM_REASONING_DRAFT_MAX_FRAMES
      ) {
        await sendReasoningDraft(event, acceptedGeneration);
      }
      reasoningBuffer = "";
      reasoningChars = 0;
      return;
    }
    if (event.type === "tool-start") {
      tools.set(event.toolCallId, {
        id: event.toolCallId,
        name: event.toolName,
        args: serializeActivityValue(event.args),
        updates: [],
        droppedUpdates: 0,
        complete: false,
      });
      toolOrder.push(event.toolCallId);
      return;
    }
    if (event.type === "tool-update") {
      const tool = tools.get(event.toolCallId);
      if (!tool) return;
      tool.updates.push(serializeActivityValue(event.update));
      if (tool.updates.length > TELEGRAM_TOOL_UPDATE_MAX_ENTRIES) {
        tool.updates.shift();
        tool.droppedUpdates += 1;
      }
      return;
    }
    if (event.type === "tool-end") {
      const tool = tools.get(event.toolCallId) ?? {
        id: event.toolCallId,
        name: event.toolName,
        args: serializeActivityValue(undefined),
        updates: [],
        droppedUpdates: 0,
        complete: false,
      };
      if (!tools.has(event.toolCallId)) toolOrder.push(event.toolCallId);
      tool.result = serializeActivityValue(event.result);
      tool.isError = event.isError;
      tool.complete = true;
      tools.set(event.toolCallId, tool);
      while (toolOrder.length > 0) {
        const next = tools.get(toolOrder[0]!);
        if (!next?.complete) break;
        toolOrder.shift();
        tools.delete(next.id);
        await publishTool(event, next, acceptedGeneration);
        if (generation !== acceptedGeneration) return;
      }
      return;
    }
    if (event.type === "agent-end" || event.type === "agent-settled") {
      clearActivity();
    }
  };
  return {
    accept(event) {
      if (!active) return;
      const acceptedGeneration = generation;
      tail = tail
        .then(() => {
          if (!active || generation !== acceptedGeneration) return;
          return process(event, acceptedGeneration);
        })
        .catch((error) => {
          deps.recordFailure?.("tool-send", event, error);
        });
    },
    reset() {
      generation += 1;
      clearActivity();
      tail = Promise.resolve();
    },
    stop() {
      active = false;
      generation += 1;
      clearActivity();
      tail = Promise.resolve();
    },
    waitForIdle() {
      return tail;
    },
  };
}
