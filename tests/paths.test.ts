/**
 * Regression tests for Telegram bridge path resolution
 * Guards agent-dir detection for Pi-compatible runtimes and path derivation helpers.
 */

import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  getTelegramDiagnosticsDisplayPaths,
  getTelegramProfilePathSuffix,
  resolveAgentDir,
  resolveTelegramConfigPath,
  resolveTelegramFollowerJournalPath,
  resolveTelegramOwnersPath,
  resolveTelegramProfileTempFilePath,
  resolveTelegramRuntimeLogPath,
  resolveTelegramTempDir,
  resolveTelegramUpdateJournalPath,
} from "../lib/paths.ts";

await test("resolveAgentDir", async (t) => {
  await t.test("returns PI_CODING_AGENT_DIR when env is set", () => {
    assert.equal(
      resolveAgentDir({
        env: { PI_CODING_AGENT_DIR: "/custom/agent/dir" },
        execPath: "/usr/bin/omp",
        argv: ["omp"],
      }),
      resolve("/custom/agent/dir"),
    );
  });

  await t.test("returns ~/.omp/agent for OMP-compatible runtimes", () => {
    assert.equal(
      resolveAgentDir({ env: {}, execPath: "/home/user/.local/bin/omp" }),
      join(homedir(), ".omp", "agent"),
    );
    assert.equal(
      resolveAgentDir({
        env: {},
        execPath: "/usr/bin/node",
        argv: ["node", "omp"],
      }),
      join(homedir(), ".omp", "agent"),
    );
  });

  await t.test("returns PRIME_AGENT_CODING_AGENT_DIR when env is set", () => {
    assert.equal(
      resolveAgentDir({
        env: { PRIME_AGENT_CODING_AGENT_DIR: "/custom/prime/agent" },
        execPath: "/usr/bin/node",
        argv: [
          "node",
          "/opt/node_modules/prime-agent/dist/bundle/cli.js",
        ],
      }),
      resolve("/custom/prime/agent"),
    );
  });

  await t.test("keeps PI_CODING_AGENT_DIR precedence over PRIME_AGENT_CODING_AGENT_DIR", () => {
    assert.equal(
      resolveAgentDir({
        env: {
          PI_CODING_AGENT_DIR: "/custom/pi/agent",
          PRIME_AGENT_CODING_AGENT_DIR: "/custom/prime/agent",
        },
        execPath: "/usr/bin/node",
        argv: ["node"],
      }),
      resolve("/custom/pi/agent"),
    );
  });

  await t.test("returns ~/.prime/agent for prime-agent runtimes", () => {
    assert.equal(
      resolveAgentDir({
        env: {},
        execPath: "/usr/bin/node",
        argv: [
          "node",
          "/opt/node_modules/prime-agent/dist/bundle/cli.js",
        ],
      }),
      join(homedir(), ".prime", "agent"),
    );
    assert.equal(
      resolveAgentDir({
        env: {},
        execPath: "/opt/node_modules/prime-agent/dist/bundle/cli.js",
        argv: ["node"],
      }),
      join(homedir(), ".prime", "agent"),
    );
  });

  await t.test(
    "returns ~/.pi/agent as fallback when no env and no OMP runtime",
    () => {
      assert.equal(
        resolveAgentDir({ env: {}, execPath: "/usr/bin/node", argv: ["node"] }),
        join(homedir(), ".pi", "agent"),
      );
    },
  );
});

await test("resolveTelegramConfigPath", () => {
  assert.ok(
    resolveTelegramConfigPath().endsWith("telegram.json"),
    "config path ends with telegram.json",
  );
});

await test("resolveTelegramOwnersPath", () => {
  assert.ok(
    resolveTelegramOwnersPath().endsWith(join("tmp", "telegram", "owners.json")),
    "owners path ends with the platform-native tmp/telegram/owners.json suffix",
  );
});

await test("resolveTelegramTempDir", () => {
  assert.ok(
    resolveTelegramTempDir().endsWith(join("tmp", "telegram")),
    "temp dir ends with the platform-native tmp/telegram suffix",
  );
});

await test("resolveTelegramRuntimeLogPath", () => {
  assert.ok(
    resolveTelegramRuntimeLogPath().endsWith(
      join("tmp", "telegram", "logs.jsonl"),
    ),
    "runtime log path ends with the platform-native logs.jsonl suffix",
  );
});

await test("update journal paths are profile-scoped", () => {
  assert.equal(
    resolveTelegramUpdateJournalPath("/agent", "default"),
    join("/agent", "tmp", "telegram", "inbox.json"),
  );
  assert.equal(
    resolveTelegramUpdateJournalPath("/agent", "work"),
    join("/agent", "tmp", "telegram", "inbox.work.json"),
  );
});

await test("follower journal paths are stable binding and profile scoped", () => {
  const first = resolveTelegramFollowerJournalPath(
    "manual-follower:owner-a",
    "/agent",
    "work",
  );
  assert.equal(
    first,
    resolveTelegramFollowerJournalPath(
      "manual-follower:owner-a",
      "/agent",
      "work",
    ),
  );
  assert.notEqual(
    first,
    resolveTelegramFollowerJournalPath(
      "manual-follower:owner-b",
      "/agent",
      "work",
    ),
  );
  assert.match(
    first,
    /follower-inbox-[a-f0-9]{16}\.work\.json$/u,
  );
});

await test("explicit default profile keeps canonical unsuffixed paths", () => {
  assert.equal(getTelegramProfilePathSuffix("default"), "");
  assert.equal(
    resolveTelegramProfileTempFilePath("state", "json", "/agent", "default"),
    resolveTelegramProfileTempFilePath("state", "json", "/agent"),
  );
  assert.deepEqual(
    getTelegramDiagnosticsDisplayPaths("default"),
    getTelegramDiagnosticsDisplayPaths(),
  );
});

await test("diagnostics display paths follow the resolved agent dir", async (t) => {
  const previous = process.env.PRIME_AGENT_CODING_AGENT_DIR;
  if (previous === undefined) delete process.env.PRIME_AGENT_CODING_AGENT_DIR;
  else process.env.PRIME_AGENT_CODING_AGENT_DIR = previous;
  t.after(() => {
    if (previous === undefined) delete process.env.PRIME_AGENT_CODING_AGENT_DIR;
    else process.env.PRIME_AGENT_CODING_AGENT_DIR = previous;
  });
  const agentDir = "/custom/prime/display-agent";
  process.env.PRIME_AGENT_CODING_AGENT_DIR = agentDir;
  try {
    assert.deepEqual(getTelegramDiagnosticsDisplayPaths(), {
      state: join(agentDir, "tmp", "telegram", "state.json"),
      logs: join(agentDir, "tmp", "telegram", "logs.jsonl"),
    });
    assert.deepEqual(getTelegramDiagnosticsDisplayPaths("work"), {
      state: join(agentDir, "tmp", "telegram", "state.work.json"),
      logs: join(agentDir, "tmp", "telegram", "logs.work.jsonl"),
    });
  } finally {
    if (previous === undefined) delete process.env.PRIME_AGENT_CODING_AGENT_DIR;
    else process.env.PRIME_AGENT_CODING_AGENT_DIR = previous;
  }
});
