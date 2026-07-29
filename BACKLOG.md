# Project Backlog

_This backlog tracks only open release-relevant work: hotfixes, bounded maintenance, live runtime verification, evidence-gated Telegram client follow-ups, and upstream Pi API blockers. Completed outcomes and validation evidence belong in `CHANGELOG.md`, not in this queue._

## P0 — Rich Tool Activity And Discoverable Defaults Release

Context: Thinking keeps its current persistent HTML expandable quote. Tool activity moves to native Rich Messages so arguments, retained updates, and result/error evidence become separate collapsed details containing compact JSON code blocks. New installations should discover context and activity features through `assistant.timeInjection: "interval"` and `assistant.activity: "verbose"` defaults without migrating explicit existing settings.

Open work:

- [x] Render completed tool batches through `sendRichMessage` / `editMessageText.rich_message` with one sentence-case tool header followed by separate closed `Arguments`, `Update N`, and `Result`/`Error` details containing `json` pre blocks.
- [x] Preserve tool ordering, coalescing, redaction, truncation, dropped-update evidence, transport/authority fencing, message bounds, final-answer ordering, and commit-unknown no-replay behavior; use the existing HTML representation only for a known-safe Rich capability rejection.
- [x] Change absent Activity mode to `verbose` and absent time injection mode to `interval` with the existing one-hour interval fallback; preserve every explicit stored value without migration.
- [x] Update tests, README, technical docs, durable project rules, changelog, and package metadata for the final behavior.
- [ ] Publish and verify GitHub/npm release evidence for `0.26.0`.
- [ ] Live-smoke Rich tool details on Telegram mobile and Desktop in classic and Threaded Mode, including multi-tool batches, updates, truncation, failures, follower transport, and final-answer ordering.

Done when: native Rich tool activity is compact and logically segmented, explicit settings remain authoritative, new defaults are discoverable, automated validation passes, live clients confirm the rendering/routing contract, and the release is published through the repository release flow.

## P1 — Configurable Activity Live Smoke

Context: configurable activity offers quiet, thinking-only, tools-only, and verbose modes. Thinking uses persistent collapsed ordinary HTML instead of draft-only Rich Thinking blocks; completed tools use native Rich details with JSON code blocks.

Open work:

- [ ] Live-smoke all four modes in classic and Threaded Mode on Telegram mobile and Desktop, including progressive thinking edits, multiple sequential tools, oversized output rollover, cancellation during thinking, tool failure, session replacement, follower transport, and final-answer ordering.

Done when: live mobile and Desktop clients confirm the intended mode isolation, persistent disclosures, routing, rollover, cancellation, failure, and final-answer ordering behavior in classic and Threaded Mode.

## P1 — Native Windows Runtime Smoke

Context: Deterministic ownership, persistence, recovery, process, and named-pipe coverage passes on native hosted Windows. A live Telegram client remains the only unverified platform boundary and may be exercised in a later release cycle rather than tied to a specific version.

Latest automated evidence: the `0.24.11` base commit `313b4ee` passed the complete `windows-latest` typecheck, test, and package job on 2026-07-25 ([Actions run 30174521046](https://github.com/llblab/pi-telegram/actions/runs/30174521046)). This proves native hosted-Windows automation, not the operator-driven Telegram/named-pipe smoke below.

Open work:

- [ ] Run a current build through native Windows classic and Threaded Mode smoke: connect, ownership handoff, leader/follower registration, stale recovery, live downgrade, diagnostics rotation, and shutdown cleanup. Record concrete named-pipe, atomic-file, and Telegram-client evidence.

Done when: native Windows live evidence confirms singleton and leader/follower authority, recovery, diagnostics, downgrade, and shutdown behavior.

## Blocked — Same-Thread Telegram `/new`

Blocked: upstream Pi core API remains unavailable. Issue #5952 was auto-closed by intake policy rather than resolved: https://github.com/earendil-works/pi/issues/5952

Context: Threaded Mode manual followers are separate visible Pi processes. Same-thread `/new` is a different feature: replacing the current Pi session inside the same Telegram thread. Extension-only hacks are rejected because they would desynchronize Pi lifecycle/TUI semantics.

Current upstream evidence (reverified 2026-07-28): issue #5952 remains closed as `not planned` by the new-contributor intake automation. The maintainer described an async extension bridge as potentially possible after the current refactor, subsequent users added supporting use cases through 2026-07-12, and no supported API or implementation was posted. The latest published Pi is 0.82.1; its current `main` `ExtensionAPI` still has no `newSession` or session-replacement method, while `ctx.newSession()` remains limited to registered extension commands through `ExtensionCommandContext`, including fresh-context rebinding after replacement. Telegram update and callback handlers receive only `ExtensionContext`, and extension-origin `pi.sendUserMessage()` deliberately disables slash-command handling.

Required upstream shape:

- `pi.newSession(...)` or `pi.requestSessionReplacement(...)` callable from trusted extension runtime code.
- Must use the same session-replacement path as the terminal command, including normal `session_shutdown` / `session_start` lifecycle.

Constraints:

- Do not store stale `ExtensionCommandContext`.
- Do not inject TUI input.
- Do not spawn a shadow `pi` subprocess.
- Do not mutate session files directly.
- Do not route through `pi.exec`; it is shell execution, not a Pi slash-command dispatcher.

Done when: `/new` in the current Telegram thread performs an official same-instance session replacement, preserves the thread binding, rebinds after lifecycle restart, reports success/cancellation in the same thread, and has regressions for active turns, pending Pi messages, queue state, preview cleanup, cancellation, failure, and success.
