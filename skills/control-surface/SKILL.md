---
name: control-surface
description: Generates contextual, evidence-backed prompt-button interfaces as transient control surfaces for workflows, tools, stateful systems, choices, navigation, and operator actions—not only terminals. Use when a user asks the agent to generate buttons or a contextual operating surface through Telegram or another prompt-button transport. Existing transport menus and callback interfaces remain with their runtime owners.
---

# Control Surface

Generate a temporary, truthful interface that turns the agent's current understanding and available capabilities into useful controls. The agent remains the interpreter, authority boundary, and interface generator; buttons are contextual prompts, not a second application, hidden daemon, or direct grant of capability.

## Concept

```text
User intent + current evidence → compact state projection → contextual controls
→ next prompt → authorized act → fresh projection
```

Each response is one generated control surface. Reinspect mutable reality after actions and regenerate the surface instead of maintaining a parallel UI model.

## Scope

Use this Skill only to synthesize an agent-generated prompt-button surface. Operating or modifying an existing Telegram bridge menu, callback interface, or runtime-owned control stays with that subsystem and does not route here merely because it contains buttons.

A control surface may expose:

- Observation: status, evidence, progress, diagnostics, or summaries.
- Navigation: files, concepts, projects, artifacts, media, threads, or Actor Runs.
- Action: safe next operations over tools, workflows, services, or project state.
- Choice: alternatives, filters, priorities, approvals, or design decisions.
- Supervision: pause, continue, inspect, redirect, retry, or stop bounded work.

Console programs are one capability source, not the defining boundary. Use the real owner of each capability: a tool, API, repository, Actor runtime, filesystem, media system, documented workflow, or the explicit state of the conversation.

## Core Contract

- Generate controls from current evidence, an explicit contract, or clearly labeled conversational state.
- Keep domain state with its real owner; never invent a shadow navigation tree, task database, or application session.
- Make every button prompt self-contained: identify the target, intended result, relevant constraints, and freshness requirement.
- Treat a click as an ordinary user request subject to the same authority, validation, and safety rules as typed text.
- Never infer permission for destructive, privileged, credential-bearing, external, or irreversible work merely because a button exists.
- Do not encode secrets, hidden reasoning, credentials, private keys, tokens, cookies, wallet material, or sensitive content in labels or prompts.
- Show uncertainty, unavailable state, truncation, filtering, and stale evidence honestly.
- Prefer a few high-value controls over exhaustive action enumeration.

## Control Admission

Buttons are optional, but bias toward offering them when they materially shorten a likely feedback loop. If the user can approve, reject, refine, prioritize, redirect, inspect, or choose a concrete next step faster by tapping than by composing a reply, proactively expose the smallest useful control set without waiting to be asked for buttons.

Zero buttons remains preferable when controls would only decorate the answer, restate visible prose, solicit generic “What next?” input, expose an unclear consequence, or save negligible effort. A button earns its place by reducing response effort, ambiguity, turnaround time, or supervision cost while preserving an ordinary typed reply as a first-class option.

For status requests, show a compact `Refresh` control and bounded inspect/drill-down controls only when work is active, blocked, stale-sensitive, or otherwise actionable. A completed static status needs no buttons. Do not add destructive shortcuts or actions whose target and consequence are not yet clear.

## Feedback Leverage

Treat feedback compression as the primary reason to make controls more visible and proactive:

- Offer 2–6 high-confidence choices when they cover likely responses without pretending to be exhaustive.
- Prefer controls for approval gates, bounded alternatives, priority changes, review verdicts, correction direction, and active-work supervision.
- Put the most likely or highest-leverage response first, while keeping labels neutral enough to avoid steering the decision dishonestly.
- Include an explicit free-form path in visible text when the listed choices cannot represent the full answer.
- Regenerate controls after feedback so the next surface reflects the new decision rather than repeating stale options.
- Omit controls when the user is already expressing a clear command and no immediate follow-up decision is needed.

## Surface Model

A surface normally contains:

1. A short title naming the controlled object or decision.
2. A compact projection of relevant state, evidence, choices, or output.
3. Provenance when it matters: target, source, timestamp, run identity, status, or truncation note.
4. Buttons for likely next intents.
5. `Back` or `Up` for hierarchy navigation when meaningful.
6. `Refresh` when the projected state can change.

Prefer 2–6 controls for feedback and decisions; navigation collections may use up to 12 when the additional entries remain scannable. Split larger sets by category or page instead of building a button wall. Do not add navigation controls when the surface is a one-step decision.

## Truth Modes

Name the basis of the surface when ambiguity matters:

- Live: freshly inspected mutable state.
- Contract: stable documented capabilities or choices.
- Conversation: alternatives or intents established in the current dialogue.
- Adapted: bounded or transformed output whose omissions are stated.

Do not present remembered or inferred state as live. After a mutation, refresh affected state before claiming success or generating dependent controls.

## Evidence Fidelity

Preserve material identities, values, ordering, warnings, errors, and status. Adaptation may group, translate, label, paginate, rank, or collapse repeated successful detail, but it must not:

- Convert failure into success.
- Hide material warnings or unavailable evidence.
- Present a subset as complete.
- Change identifiers, values, causal order, or authority.
- Turn a proposal into completed state.

State adaptation explicitly, for example: `Показаны 20 из 184 записей, по размеру`.

## Safety And Confirmation

Classify each action as read-only, ordinary mutation, privileged, destructive, secret-bearing, external, or irreversible.

Use a two-stage flow for high-impact actions:

1. An action button opens a confirmation surface naming the exact target, effect, and recovery boundary.
2. A distinct confirmation button requests the exact operation.

Re-check mutable targets immediately before execution. Access denial never authorizes automatic privilege escalation. If evidence may expose secrets, stop before display and offer metadata-only or redacted alternatives.

## Prompt Buttons

Use the transport's canonical prompt-button syntax. For pi-telegram, emit a top-level hidden comment:

```html
<!-- telegram_button {"label":"🔍 Inspect run","prompt":"Inspect Run run:example read-only, summarize its current status and latest material evidence, then regenerate relevant supervision controls."} -->
```

Button prompts must:

- Preserve the user's language.
- Name exact targets where possible.
- Express one coherent next intent.
- Carry material safety and scope restrictions.
- Request fresh inspection when state may have changed.
- Avoid embedding volatile output that should be rediscovered.

Labels stay short, distinct, and scannable. Emoji are optional semantic markers; do not rely on color alone. If buttons are unavailable, render the same control surface as a numbered choice list.

## Capability Adapters

### Console And System

Use normal console programs as the capability owner. Check exit status and stderr before rendering success. Preserve complete output when reasonably sized; otherwise label pagination, filtering, head/tail, or ranked subsets. High-impact process, service, package, permission, shutdown, disk, and deletion actions require confirmation.

### Filesystem

Resolve paths before listing. Directory navigation may show safe names and metadata without reading contents. Never preview credential stores, private keys, browser profiles, cookies, tokens, wallets, or other secret-bearing files. Use unambiguous paths in prompts and offer safe operations before mutations.

### Workflows And Actor Runs

Keep exact workflow, Recipe, Run, artifact, or task identity visible. Controls may inspect, pause, continue, redirect, retry, or stop only through the owning runtime contract. Never simulate lifecycle state, bypass Control semantics, or treat a generated button as direct execution authority.

### Decisions And Design

Buttons may represent explicit alternatives without live system inspection. State the decision being made, preserve meaningful trade-offs in visible text, and ensure each prompt records the selected intent rather than silently executing downstream consequences.

## Action Procedure

1. Identify the controlled object, user goal, and capability owner.
2. Decide whether the surface needs live, contract, conversational, or adapted evidence.
3. Inspect only the state required for a truthful projection.
4. Classify candidate controls by authority and impact.
5. Render compact state plus context-relevant controls.
6. On the next turn, interpret the click as a new request and execute only what it authorizes.
7. Validate the result and regenerate from retained reality.

## Failure And Empty States

- Show concise failure evidence and offer diagnosis, retry, refresh, back, or a narrower action.
- If a target disappears, return to the nearest valid parent or owner instead of reusing stale controls.
- If no action is currently valid, say so rather than generating decorative buttons.
- Mark unsupported, sentinel, inferred, or unreliable values explicitly.
- Keep safe navigation and refresh controls in empty collections when useful.

## Quality Check

Before sending a surface, verify:

- State and controls share one clear owner and target.
- Live claims come from current evidence.
- Complete versus filtered or adapted output is labeled honestly.
- No secret appears in visible text or button payloads.
- Every button carries a valid self-contained next intent and measurably shortens likely feedback.
- The surface preserves free-form feedback when choices are not exhaustive.
- High-impact operations route through confirmation.
- Back/Up and Refresh appear only when useful.
- The surface remains readable on a mobile screen.
