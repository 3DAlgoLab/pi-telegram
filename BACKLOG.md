# Project Backlog

_This backlog tracks only open release-relevant work: hotfixes, bounded maintenance, live runtime verification, evidence-gated Telegram client follow-ups, and upstream Pi API blockers. Completed outcomes and validation evidence belong in `CHANGELOG.md`, not in this queue._

## P1 — 0.25.0 Configurable Activity Verbosity

Context: Start the next minor release with an operator-controlled Telegram activity surface. Current behavior remains the quiet default: users receive assistant previews, intermediate public prose, and final answers without model reasoning or tool traffic. A new verbose mode should add compact technical reasoning and tool activity without turning bridge-owned UI into Markdown or mixing it into the semantic answer stream.

Bot API evidence: Bot API 10.2 exposes explicit outgoing Rich Message blocks. `InputRichBlockThinking` is draft-only and disappears when the draft lifecycle ends; `InputRichBlockDetails` provides a collapsed disclosure container, and `InputRichBlockPreformatted` provides nested `<pre><code>` content. Exact mobile/Desktop rendering, edit behavior, and practical limits remain live-verification gates.

Open work:

- [x] Add a persisted `Activity` Settings option backed by `assistant.activity`, with exactly two initial values: `quiet` (default/current behavior) and `verbose` (reasoning plus tool activity). Omitted or invalid configuration must resolve to `quiet`; legacy `assistant.activityVerbosity` is read only when the canonical key is absent and removed on the next write. Settings must follow the existing nested list-option UI and callback/persistence concurrency contracts.
- [x] In `verbose`, stream reasoning content exposed by supported Pi lifecycle events through a short-lived Telegram Rich Draft `Thinking` block bound to the exact chat/thread, profile, session generation, and direct-owner or follower authority. Finalization, cancellation, failure, replacement, and disconnect must clear local draft ownership without creating a persisted reasoning message or projecting unavailable provider-private chain-of-thought.
- [x] Persist completed tool activity as bridge-owned compact ordinary HTML messages rather than assistant Markdown or Rich Messages. Render each tool call under one registered semantic icon and tool name with bounded, escaped arguments, updates, result, and error evidence inside a standard expandable blockquote.
- [x] Coalesce consecutive tool calls from one ordered run into the same editable ordinary message while it remains within Telegram HTML message limits, with one independent expandable blockquote per call. Start a new message when the current message cannot safely accept another block; never reorder tools across assistant prose, reasoning boundaries, targets, runs, or lifecycle generations.
- [x] Define bounded output, redaction, truncation, retry, edit-ambiguity, and transport-failure behavior so verbose mode cannot leak known secrets, flood the target, replay a possibly committed message, block Pi lifecycle completion, or disturb quiet-mode preview/final ordering. Record failures through existing diagnostics.
- [x] Reconcile the current no-hidden-reasoning invariant and Rich rendering boundary in `AGENTS.md`, then update README, Settings/configuration docs, architecture/outbound docs, public activity guidance, UI emoji registry, and focused config/menu/activity/delivery/rendering/integration regressions.
- [x] Order first-level `Settings` by operator meaning while keeping `⬆️ Main menu` first: message presentation (`Draft previews`, `Rendering`, `Voice reply`), technical/public activity (`Activity`, `Proactive push`), prompt context (`Time injection`), then lifecycle (`Thread cleanup`). Append extension-provided rows using their explicit `settings.order` and stable section-id tie-break, preserve each detail submenu's semantic option order, and add focused menu/section regressions.
- [ ] Live-smoke both modes in classic and Threaded Mode on Telegram mobile and Desktop, including multiple sequential tools, oversized output rollover, cancellation during reasoning, tool failure, session replacement, follower transport, and final-answer ordering.

Done when: `quiet` remains behaviorally unchanged, `verbose` shows ephemeral reasoning plus durable collapsed tool-call evidence with exact routing and bounded safe output, first-level Settings entries follow the documented semantic groups with deterministic extension ordering, Settings survives reload and concurrent persistence, all automated validation passes, and live clients confirm the intended draft/disclosure UX.

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
