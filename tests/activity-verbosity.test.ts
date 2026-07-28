/**
 * Telegram activity verbosity projection regressions
 * Covers four activity modes, persistent reasoning, bounded tool disclosures, ordering, redaction, and authority fencing
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramActivityVerbosityRuntime,
  renderTelegramThinkingActivityHtml,
  renderTelegramToolActivityHtml,
  TELEGRAM_ACTIVITY_MESSAGE_MAX_TOOLS,
  TELEGRAM_REASONING_BUFFER_MAX_CHARS,
  TELEGRAM_TOOL_UPDATE_MAX_ENTRIES,
} from "../lib/activity-verbosity.ts";
import type {
  TelegramActivityEvent,
  TelegramActivityPayload,
} from "../lib/activity.ts";
import type {
  TelegramEditMessageTextBody,
  TelegramSendMessageBody,
} from "../lib/telegram-api.ts";

function event(
  sequence: number,
  payload: TelegramActivityPayload,
): TelegramActivityEvent {
  return {
    ...payload,
    activityId: "session:1",
    sequence,
    source: "telegram",
    target: { chatId: 42, threadId: 7 },
    timestamp: sequence,
  } as TelegramActivityEvent;
}

type ActivityMode = "quiet" | "thinking" | "tools" | "verbose";

function createHarness(options: { mode?: ActivityMode } = {}) {
  let mode = options.mode ?? "verbose";
  let authority = 1;
  const sends: TelegramSendMessageBody[] = [];
  const edits: TelegramEditMessageTextBody[] = [];
  const runtime = createTelegramActivityVerbosityRuntime({
    getActivityMode: () => mode,
    resolveTarget: (activity) => activity.target,
    captureAuthority: () => authority,
    isAuthorityActive: (captured) => captured === authority,
    async sendMessage(body) {
      sends.push(body);
      return { message_id: sends.length };
    },
    async editMessageText(body) {
      edits.push(body);
      return "edited";
    },
  });
  return {
    runtime,
    sends,
    edits,
    setMode(value: ActivityMode) {
      mode = value;
    },
    replaceAuthority() {
      authority += 1;
    },
  };
}

test("quiet activity emits no reasoning or tool messages", async () => {
  const harness = createHarness({ mode: "quiet" });
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, { type: "reasoning-delta", contentIndex: 0, delta: "secret" }),
  );
  harness.runtime.accept(
    event(3, {
      type: "tool-end",
      toolCallId: "tool-1",
      toolName: "read",
      result: "done",
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();
  assert.deepEqual(harness.sends, []);
});

test("tool evidence renders as ordinary expandable HTML", () => {
  const html = renderTelegramToolActivityHtml([
    {
      id: "tool-1",
      name: "exec<script>",
      args: '{\n  "command": "npm run check -w @ail/web",\n  "options": {\n    "timeout": 240\n  }\n}',
      updates: ['{\n  "content": []\n}'],
      droppedUpdates: 0,
      result: '{\n  "content": []\n}',
      isError: false,
      complete: true,
    },
  ]);

  assert.match(
    html,
    /^<b>🛠&#160; exec&lt;script&gt;:<\/b> <code>done<\/code>/,
  );
  assert.match(html, /<blockquote expandable>/);
  assert.match(html, /"arguments": \{\n  "command"/);
  assert.match(html, /"update 1": \{\n  "content": \[\]/);
  assert.match(html, /"result": \{\n  "content": \[\]/);
  assert.doesNotMatch(html, /rich_message|<pre>/);

  const statuses = renderTelegramToolActivityHtml([
    {
      id: "running",
      name: "read",
      args: "{}",
      updates: [],
      droppedUpdates: 0,
      complete: false,
    },
    {
      id: "failed",
      name: "write",
      args: "{}",
      updates: [],
      droppedUpdates: 0,
      result: '"denied"',
      isError: true,
      complete: true,
    },
  ]);
  assert.match(statuses, /<code>running<\/code>/);
  assert.match(statuses, /<code>failed<\/code>/);
});

test("reasoning uses a persistent target-bound expandable HTML message", async () => {
  const harness = createHarness({ mode: "thinking" });
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "reasoning-delta",
      contentIndex: 0,
      delta: "Checking ",
    }),
  );
  harness.runtime.accept(
    event(3, {
      type: "reasoning-delta",
      contentIndex: 0,
      delta: "**state**",
    }),
  );
  harness.runtime.accept(
    event(4, {
      type: "reasoning-end",
      contentIndex: 0,
      text: "Checking **state**",
    }),
  );
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 1);
  assert.equal(harness.sends[0]?.chat_id, 42);
  assert.equal(harness.sends[0]?.message_thread_id, 7);
  assert.deepEqual(harness.sends[0]?.link_preview_options, {
    is_disabled: true,
  });
  assert.match(harness.sends[0]?.text ?? "", /^<b>🧠&#160; thinking:<\/b>/);
  assert.match(harness.sends[0]?.text ?? "", /<blockquote expandable>/);
  assert.equal(harness.edits.length, 1);
  assert.match(harness.edits[0]?.text ?? "", /<code>done<\/code>/);
  assert.match(harness.edits[0]?.text ?? "", /Checking \*\*state\*\*/);
  assert.equal(harness.edits[0]?.parse_mode, "HTML");
  assert.deepEqual(harness.edits[0]?.link_preview_options, {
    is_disabled: true,
  });
  assert.equal(harness.edits[0]?.rich_message, undefined);
});

test("agent end finalizes an open thinking message without deleting it", async () => {
  const harness = createHarness({ mode: "thinking" });
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "reasoning-delta",
      contentIndex: 0,
      delta: "still thinking",
    }),
  );
  harness.runtime.accept(event(3, { type: "agent-end" }));
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 1);
  assert.equal(harness.edits.length, 1);
  assert.match(harness.edits[0]?.text ?? "", /<code>done<\/code>/);
});

test("thinking and tools modes isolate their activity classes", async () => {
  for (const mode of ["thinking", "tools"] as const) {
    const harness = createHarness({ mode });
    harness.runtime.accept(event(1, { type: "agent-start" }));
    harness.runtime.accept(
      event(2, {
        type: "reasoning-end",
        contentIndex: 0,
        text: "private thought",
      }),
    );
    harness.runtime.accept(
      event(3, {
        type: "tool-end",
        toolCallId: "tool-1",
        toolName: "read",
        result: "done",
        isError: false,
      }),
    );
    await harness.runtime.waitForIdle();
    const text = harness.sends.map((body) => body.text).join("\n");
    assert.equal(text.includes("🧠"), mode === "thinking");
    assert.equal(text.includes("🛠"), mode === "tools");
  }
});

test("reasoning evidence renders as ordinary expandable HTML", () => {
  const html = renderTelegramThinkingActivityHtml("a < b", false);
  assert.match(html, /^<b>🧠&#160; thinking:<\/b> <code>running<\/code>/);
  assert.match(html, /<blockquote expandable>a &lt; b<\/blockquote>/);
  assert.doesNotMatch(html, /rich_message/);
});

test("completed consecutive tools coalesce as collapsed redacted details", async () => {
  const harness = createHarness();
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "tool-start",
      toolCallId: "one",
      toolName: "exec",
      args: { token: "123456789:abcdefghijklmnopqrstuvwxyzABCDEFGHIJK" },
    }),
  );
  harness.runtime.accept(
    event(3, {
      type: "tool-end",
      toolCallId: "one",
      toolName: "exec",
      result: "ok",
      isError: false,
    }),
  );
  harness.runtime.accept(
    event(4, {
      type: "tool-start",
      toolCallId: "two",
      toolName: "read",
      args: { path: "/tmp/a" },
    }),
  );
  harness.runtime.accept(
    event(5, {
      type: "tool-end",
      toolCallId: "two",
      toolName: "read",
      result: "failed",
      isError: true,
    }),
  );
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 1);
  assert.equal(harness.edits.length, 1);
  const serialized = harness.edits[0]?.text ?? "";
  assert.match(serialized, /🛠/);
  assert.match(serialized, /<blockquote expandable>/);
  assert.match(serialized, /REDACTED/);
  assert.doesNotMatch(serialized, /abcdefghijklmnopqrstuvwxyzABCDEFGHIJK/);
  assert.equal(harness.edits[0]?.parse_mode, "HTML");
  assert.deepEqual(harness.sends[0]?.link_preview_options, {
    is_disabled: true,
  });
  assert.deepEqual(harness.edits[0]?.link_preview_options, {
    is_disabled: true,
  });
  assert.equal(harness.edits[0]?.rich_message, undefined);
});

test("tool evidence quotes labels and compacts arrays of objects", async () => {
  const harness = createHarness();
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "tool-start",
      toolCallId: "compact",
      toolName: "ffgrep",
      args: { pattern: "CORE_SERVICE_URL", path: "apps/admin/", limit: 30 },
    }),
  );
  harness.runtime.accept(
    event(3, {
      type: "tool-update",
      toolCallId: "compact",
      toolName: "ffgrep",
      update: {
        content: [
          { type: "text", text: "\n" },
          { type: "text", text: "\n" },
        ],
        details: {},
      },
    }),
  );
  harness.runtime.accept(
    event(4, {
      type: "tool-end",
      toolCallId: "compact",
      toolName: "ffgrep",
      result: { content: [] },
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();

  const html = harness.sends[0]?.text ?? "";
  assert.match(html, /"arguments": \{/);
  assert.match(
    html,
    /"update 1": \{\n  "content": \[\{\n    "type": "text",\n    "text": "\\n"\n  \}, \{\n    "type": "text",\n    "text": "\\n"\n  \}\],\n  "details": \{\}\n\}/,
  );
  assert.match(html, /"result": \{\n  "content": \[\]\n\}/);
});

test("assistant boundaries, capacity, and authority replacement fence batches", async () => {
  const harness = createHarness();
  harness.runtime.accept(event(1, { type: "agent-start" }));
  let sequence = 2;
  for (let index = 0; index < TELEGRAM_ACTIVITY_MESSAGE_MAX_TOOLS + 1; index++) {
    harness.runtime.accept(
      event(sequence++, {
        type: "tool-end",
        toolCallId: `tool-${index}`,
        toolName: "read",
        result: index,
        isError: false,
      }),
    );
  }
  harness.runtime.accept(
    event(sequence++, {
      type: "assistant-segment",
      contentIndex: 0,
      text: "checkpoint",
      placement: "intermediate",
    }),
  );
  harness.runtime.accept(
    event(sequence++, {
      type: "tool-end",
      toolCallId: "after-boundary",
      toolName: "write",
      result: "ok",
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 3);

  harness.replaceAuthority();
  harness.runtime.accept(
    event(sequence, {
      type: "tool-end",
      toolCallId: "stale",
      toolName: "exec",
      result: "must not send",
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 3);
});

test("parallel tool completion preserves tool-start order", async () => {
  const harness = createHarness();
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "tool-start",
      toolCallId: "first",
      toolName: "first-tool",
      args: {},
    }),
  );
  harness.runtime.accept(
    event(3, {
      type: "tool-start",
      toolCallId: "second",
      toolName: "second-tool",
      args: {},
    }),
  );
  harness.runtime.accept(
    event(4, {
      type: "tool-end",
      toolCallId: "second",
      toolName: "second-tool",
      result: "second result",
      isError: false,
    }),
  );
  harness.runtime.accept(
    event(5, {
      type: "tool-end",
      toolCallId: "first",
      toolName: "first-tool",
      result: "first result",
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();
  assert.equal(harness.sends.length, 1);
  assert.equal(harness.edits.length, 1);
  const text = harness.edits[0]?.text ?? "";
  assert.ok(text.indexOf("first-tool") < text.indexOf("second-tool"));
  assert.equal(harness.edits[0]?.rich_message, undefined);
});

test("reasoning and tool updates retain bounded latest evidence", async () => {
  const harness = createHarness();
  harness.runtime.accept(event(1, { type: "agent-start" }));
  harness.runtime.accept(
    event(2, {
      type: "reasoning-delta",
      contentIndex: 0,
      delta: `old-marker-${"x".repeat(TELEGRAM_REASONING_BUFFER_MAX_CHARS)}latest-marker`,
    }),
  );
  harness.runtime.accept(
    event(3, {
      type: "tool-start",
      toolCallId: "bounded",
      toolName: "exec",
      args: {},
    }),
  );
  for (let index = 0; index < TELEGRAM_TOOL_UPDATE_MAX_ENTRIES + 3; index++) {
    harness.runtime.accept(
      event(4 + index, {
        type: "tool-update",
        toolCallId: "bounded",
        toolName: "exec",
        update: `update-${index}`,
      }),
    );
  }
  harness.runtime.accept(
    event(20, {
      type: "tool-end",
      toolCallId: "bounded",
      toolName: "exec",
      result: "done",
      isError: false,
    }),
  );
  await harness.runtime.waitForIdle();

  const reasoning = harness.sends[0]?.text ?? "";
  assert.match(reasoning, /earlier chars omitted/);
  assert.match(reasoning, /latest-marker/);
  assert.doesNotMatch(reasoning, /old-marker/);
  const tool = harness.sends[1]?.text ?? "";
  assert.match(tool, /3 earlier updates omitted/);
  assert.doesNotMatch(tool, /update-0/);
  assert.match(tool, /update-6/);
});

test("reset drops accepted events that have not started processing", async () => {
  let releaseReasoning!: () => void;
  const reasoningBlocked = new Promise<void>((resolve) => {
    releaseReasoning = resolve;
  });
  const sends: TelegramSendMessageBody[] = [];
  const runtime = createTelegramActivityVerbosityRuntime({
    getActivityMode: () => "verbose",
    resolveTarget: (activity) => activity.target,
    captureAuthority: () => 1,
    isAuthorityActive: () => true,
    async sendMessage(body) {
      if (body.text.includes("🧠")) await reasoningBlocked;
      sends.push(body);
      return { message_id: 1 };
    },
    async editMessageText() {
      return "edited";
    },
  });
  runtime.accept(event(1, { type: "agent-start" }));
  runtime.accept(
    event(2, { type: "reasoning-delta", contentIndex: 0, delta: "working" }),
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  runtime.accept(
    event(3, {
      type: "tool-end",
      toolCallId: "stale",
      toolName: "exec",
      result: "must not send",
      isError: false,
    }),
  );
  runtime.reset();
  runtime.accept({
    ...event(4, { type: "agent-start" }),
    activityId: "session:2",
  });
  runtime.accept({
    ...event(5, {
      type: "tool-end",
      toolCallId: "fresh",
      toolName: "read",
      result: "new session",
      isError: false,
    }),
    activityId: "session:2",
  });
  await runtime.waitForIdle();
  assert.equal(sends.length, 1);
  assert.match(JSON.stringify(sends[0]), /new session/);
  assert.doesNotMatch(JSON.stringify(sends[0]), /must not send/);
  releaseReasoning();
});
