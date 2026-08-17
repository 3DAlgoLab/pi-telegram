/**
 * Bundled Telegram skill discovery regressions
 * Covers source/runtime path contribution and package publication metadata
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  registerTelegramSkillDiscovery,
  TELEGRAM_SKILLS_PATH,
} from "../lib/skills.ts";

test("Telegram extension contributes both bundled skills", async () => {
  let resourceHook: (() => { skillPaths: string[] }) | undefined;
  registerTelegramSkillDiscovery({
    on(name: string, hook: unknown) {
      assert.equal(name, "resources_discover");
      resourceHook = hook as () => { skillPaths: string[] };
    },
  } as never);

  assert.deepEqual(resourceHook?.(), { skillPaths: [TELEGRAM_SKILLS_PATH] });
  const skillNames = ["telegram-bridge", "generated-control-surface"];
  const sources = new Map<string, string>();
  for (const name of skillNames) {
    const source = await readFile(join(TELEGRAM_SKILLS_PATH, name, "SKILL.md"), "utf8");
    sources.set(name, source);
    assert.match(source, new RegExp(`^name: ${name}$`, "m"));
    assert.match(source, /^description: .+$/m);
  }
  assert.match(sources.get("telegram-bridge") ?? "", /`generated-control-surface`/u);
  assert.match(sources.get("generated-control-surface") ?? "", /without requiring an explicit user request/u);
});

test("Package metadata publishes the bundled skill root", async () => {
  const packageRoot = dirname(TELEGRAM_SKILLS_PATH);
  const manifest = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  ) as { files?: string[]; pi?: { skills?: string[] } };

  assert.ok(manifest.files?.includes("skills/"));
  assert.deepEqual(manifest.pi?.skills, ["./skills"]);
});
