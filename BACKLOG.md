# Project Backlog

_This file owns unresolved project work only. Completed behavior belongs in `CHANGELOG.md`; durable contracts belong in `AGENTS.md` and `/docs`._

## P0 — 0.28.0 Cross-Platform Queue Ownership

Baseline `468a7ca20cb168e89cebae6473b1f0ceebb508fc` implements durable queue-owner identity, exact owner-fenced settlement, explicit handoff, and dead-owner recovery. Its default process-birth fallback is not a valid death proof on Windows: a live owner can be misclassified as dead because the persisted and reconstructed fallback generations differ.

Do not tag or publish `0.28.0` until queued semantic authority remains singular on every supported platform.

Tri-state liveness and deterministic coverage preserve queued authority for live or unverifiable PIDs, permit recovery only for an absent PID or mismatched stable Linux/macOS birth proof, and cover terminated owners, PID reuse, inaccessible metadata, live Windows retention without replay/settlement, concurrent registration/recovery, and exact original-owner settlement after transport movement. Remaining external evidence:

- [ ] Run the real cross-process queue-owner and handoff integration tests on hosted Windows, not only mocked platform branches.
Done when: no live or unverifiable process can lose a queued receipt, and only proven owner death can return the complete receipt to pending execution.

## P1 — 0.28.0 Hosted Validation

The validation workflow runs only for pull requests and pushes to `main`. The final candidate must have GitHub-hosted evidence on its exact SHA.

- [ ] Push the corrected candidate and open or update a pull request.
- [ ] Run the Ubuntu, macOS, and Windows matrix on exact Node `22.19.0`.
- [ ] Require every matrix job to pass:

  - dependency installation;
  - typecheck;
  - full tests;
  - package check;
  - audit where configured.

- [ ] Confirm the Windows job executes the real cross-process queue-owner liveness regression.
- [ ] Confirm all check-runs belong to the exact candidate SHA.
- [ ] Investigate flaky timer, process, named-pipe, filesystem, or process-birth failures rather than rerunning until green.
- [ ] Keep the candidate unchanged after successful checks. Any source, test, package, or contract change invalidates the hosted evidence and requires a new matrix run.

Done when: the exact release-candidate SHA has successful GitHub check-runs on Ubuntu, macOS, and Windows.

## P1 — 0.28.0 Live Runtime Evidence

Run live evidence against the exact hosted-green candidate without deleting existing runtime state. Record concrete outcome and diagnostic evidence without including private bot tokens, user ids, chat ids, message ids, thread ids, or operator-specific labels.

- [ ] Fresh `/start` and normal prompt/reply flow.
- [ ] Classic-mode ownership and takeover confirmation.
- [ ] Hot Classic → Threaded transition.
- [ ] Follower registration without unintended takeover.
- [ ] Explicit follower and leader disconnect.
- [ ] Graceful quit and same-directory restart.
- [ ] Compatible package-build skew under the same protocol version.
- [ ] Rejection of incompatible protocol and missing-capability peers.
- [ ] Negative follower acknowledgement:

  - leader source remains durable;
  - retry metadata appears;
  - no semantic loss occurs.

- [ ] Lost follower acknowledgement:

  - follower deduplicates exact delivery replay;
  - leader releases authority only after the exact receipt is observed.

- [ ] Exact message, edited-message, callback, and reaction forwarding settlement.
- [ ] Grouped media/text admission producing one exact multi-source receipt.
- [ ] Exact queue completion at prompt handoff.
- [ ] Exact queue completion after control settlement.
- [ ] Live transport ownership transfer while queued semantic ownership remains singular.
- [ ] Explicit authenticated queue handoff between live processes.
- [ ] Lost handoff acknowledgement and subsequent reconciliation without duplicate work.
- [ ] Proven dead-owner recovery.
- [ ] Live and unverifiable owner preservation.
- [ ] Poison update followed by valid updates:

  - poison remains in durable automatic retry with backoff capped at 60 seconds;
  - later independent updates complete;
  - no hot retry loop occurs.

- [ ] Configured outbound voice success.
- [ ] Voice fallback behavior when provider delivery fails.
- [ ] Debug status accurately reflects each exercised blocked, retrying, queued, foreign-owned, and completed state.
- [ ] Repeat the queue-owner recovery scenario on native or hosted Windows after the final liveness fix.
- [ ] Record the candidate SHA, Node version, OS, runtime topology, and outcome for every release-critical scenario.

Done when: live evidence demonstrates no lost update, duplicate semantic owner, poison-tail stall, unsafe handoff, or false recovery across Classic and Threaded modes.

## P1 — 0.28.0 Release Freeze And Publication

Publication actions are separate explicit operations. Do not perform them from an unverified working tree or from a SHA different from the hosted and live-tested candidate.

- [ ] Confirm the working tree is clean.
- [ ] Confirm `dev` points at the exact hosted- and live-verified candidate.
- [ ] Confirm package and lockfile versions are both `0.28.0`.
- [ ] Confirm no open P0 or P1 release task remains.
- [ ] Perform one final package dry-run from the exact candidate.
- [ ] Verify the final changelog and upgrade/downgrade guidance.
- [ ] Create the `0.28.0` tag on the exact candidate SHA.
- [ ] Create the GitHub Release from that tag.
- [ ] Publish `@llblab/pi-telegram@0.28.0` to npm.
- [ ] Install the published package into a clean Pi environment.
- [ ] Verify the installed package:

  - reports version `0.28.0`;
  - loads successfully on Node `22.19.0`;
  - contains the downgrade checker;
  - contains no tests, local skills, or runtime authority;
  - starts the bridge and completes a basic Telegram prompt/reply flow.

- [ ] Verify the npm tarball integrity and GitHub tag correspondence.
- [ ] Record the published release as complete in `CHANGELOG.md`.
- [ ] Remove the `0.28.0` release-convergence section from `BACKLOG.md`.

Done when: tag, GitHub Release, npm artifact, installed package, hosted evidence, and live evidence all identify the same immutable commit and package contents.
