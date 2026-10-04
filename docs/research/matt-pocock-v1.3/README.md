# Matt Pocock skills v1.3 audit

This is the initial, pre-integration snapshot. See [main-branch integration status](LANDING.md) for completed merges, release effects and the resolved Vokhanhbel security blocker.

Audit date: 2026-10-04. Local baseline: `cb-skills` commit `a3da85f` plus the installed skill files captured before this audit.

## Summary

Your installation already contained most of the release's patch changes. Of 23 locked Matt skills, **14 were byte-identical, eight differed, and one was removed upstream**. The practical upgrade is the glossary rename, the updated router, and better use of skills you already have, especially `retro`.

Compared against [v1.3.0](https://github.com/mattpocock/skills/releases/tag/v1.3.0), commit `984a2c023c9fb42bb6ea40c70a652284a109dc05`, and [v1.3.1](https://github.com/mattpocock/skills/releases/tag/v1.3.1), commit `24fe0ef7737efae15c87225755e9f6f5965e4888`. The latter only corrects `ask-matt`'s obsolete diagnosis/post-mortem handoff, plus docs/version metadata. It is the installation and diff target here, not moving `main`.

## Exact local-vs-upstream comparison

[Full pre-update diff](skills.diff), including upstream's deletion of the conflict skill. This compares whole skill directories, including references, scripts and agent metadata, not just `SKILL.md`.

| Installed skill | Difference before this audit |
| --- | --- |
| `ask-matt` | Glossary rename; routes to `implement-spec`, `pr`, and `retro`; removes conflict skill; v1.3.1 fixes diagnosis handoff |
| `codebase-design` | `DESIGN-IT-TWICE.md` reads `GLOSSARY.md` |
| `diagnosing-bugs` | Reads `GLOSSARY.md` |
| `domain-modeling` | Renames `CONTEXT-FORMAT.md` to `GLOSSARY-FORMAT.md`; updates all glossary/map references |
| `setup-matt-pocock-skills` | Glossary/map names in `SKILL.md` and `domain.md` |
| `tdd` | Reads `GLOSSARY.md` |
| `triage` | Writes `GLOSSARY.md` |
| `wait-what` | Reads `GLOSSARY.md` / `GLOSSARY-MAP.md` |
| `resolving-merge-conflicts` | Removed upstream without replacement; retained locally pending your decision |

The 14 identical skills: `code-review`, `grill-me`, `grill-with-docs`, `grilling`, `handoff`, `implement`, `research`, `retro`, `teach`, `to-questionnaire`, `to-spec`, `to-tickets`, `wayfinder`, `writing-for-agents`.

`retro`'s contents were identical, but its lock entry pointed to `skills/in-progress/retro/SKILL.md`. It now points to `skills/engineering/retro/SKILL.md`.

In particular, quoted YAML descriptions, explicit cross-skill calls, corrected user-invoked setup handoffs, and the grilling separators were already present locally. They are release changes, not additional benefits gained by this update.

### Available upstream but not installed from Matt

The release promotes `implement-spec`, `pr`, and `retro` to Engineering; you already had `retro`. No new skills were installed by this audit.

Other upstream names not installed: `claude-handoff`, `git-guardrails-claude-code`, `improve-codebase-architecture`, `loop-me`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`, `setup-ts-deep-modules`, `wizard`, `writing-beats`, `writing-fragments`, `writing-shape`. These are inventory gaps, not all v1.3 additions, and not a recommendation to install everything.

**Name collision:** your `prototype` is Emil Kowalski's, not Matt's. Emil's version builds visual alternatives behind a picker; Matt's is a throwaway program to answer a design question, including logic/state questions. `ask-matt` describes Matt's version. Keep this distinction explicit rather than silently replacing yours. [Separate content diff](prototype-collision.diff).

Your repository-owned `pi-code-review` is a thin execution adapter around the installed Matt `code-review`. That upstream skill is unchanged; no adapter edit is needed for this release.

## Changes applied

- Updated the eight changed skills via Skills CLI, plus `retro`'s moved source path. Those nine entries explicitly record `ref: v1.3.1` in `skills-lock.json`.
- Verified all **22 still-existing Matt skills** now match v1.3.1 byte-for-byte across their complete directories. Retained the locally installed, upstream-removed conflict skill.
- Left non-Matt skills and repository-owned adapters intact.
- Re-ran `scripts/install.sh`; it linked 40 skills successfully.
- Corrected the README add command to select both Codex and Claude Code. Observed CLI behavior: choosing only Claude Code copied the update into `.claude/skills` while leaving `.agents/skills` stale, despite updating the lock. Re-running with both agents repaired the canonical shared copies and Claude links. Verification was against the actual shared files, not only the lock.

### Glossary migration

Each migration uses `git mv CONTEXT.md GLOSSARY.md`, preserving the glossary bytes. Updated live references in domain guidance, README files, agent pointers and one source comment. No actual `CONTEXT-MAP.md` files were found; map examples in guidance were updated.

| Repository | Migration location |
| --- | --- |
| `cb-podcast-vault` | `/root/cb-coding/cb-podcast-vault` |
| `vokhanhbel` | `/root/cb-coding/vokhanhbel/.worktrees/glossary-v13` |
| `FeBOp-monorepo` | `/root/rb-imconsult/FeBOp-monorepo/.worktrees/glossary-v13` |
| `FeBOp-input-monitor` | `/root/rb-imconsult/FeBOp-input-monitor/.worktrees/glossary-v13` |
| `xr-learning-app` | `/root/xr-learning-app/.worktrees/glossary-v13` |

The four worktrees use branch `docs/glossary-v13`, following their repositories' protected-primary-checkout rules. These are **prepared, uncommitted migrations**, not merged changes. Their primary checkouts and pre-existing feature worktrees still use the old names until integration. No pushes, PRs, Linear writes or deployments were made. XR's change is limited to the requested agent-workflow configuration migration, not an implementation ticket.

**Important transition caveat:** the shared skills now look for the new names. Finish reviewing/integrating these migrations before relying on glossary discovery in the unchanged primary/feature checkouts. Reconcile existing feature branches through each repository's normal integration workflow; do not mass-rename files underneath active agents.

### Does `/setup-matt-pocock-skills` need rerunning?

No wholesale rerun is required. Its only differences from your installed copy are the glossary/map naming changes in the prompt and domain template. Issue-tracker and triage-label templates are identical. Existing Linear mappings, local trackers, ADR layout and approval rules should remain intact. Update existing domain pointers and filenames; rerun setup only when intentionally changing configuration.

The new `implement-spec` needs no new setup file: it consumes the existing tracker and its native blocking relationships. However, its autonomous merging/closing/cleanup defaults must remain subordinate to your per-repository approval and tracker-completion rules.

## Last 25 sessions: observed use

[Sanitized evidence and line references](session-usage.json).

Method: selected the 25 most recently modified local session JSONL files across Pi, Claude Code and Codex, excluding this audit session. The sample contains **24 Pi sessions and one Codex image-generation helper**, with last activity on October 3–4; some long-running sessions began October 1. Active sessions can continue after this snapshot. This is a recent local activity sample, not 25 completed coding tasks, and includes non-coding sessions and delegated work. No remote-machine or unavailable logs are included.

Counted actual assistant calls reading `SKILL.md` (including reads inside codemode/shell calls), plus user-expanded skill blocks separately. Excluded system skill catalogs, tool-result mentions, ordinary prose mentions and arbitrary slash-prefixed filesystem paths. Counts show **loads, not proof the whole workflow was followed**; rereads count as additional loads, but only once per session in the main column. Unsaved reviewer children cannot be counted from these logs.

| Matt skill | Sessions / 25 | Observed loads |
| --- | ---: | ---: |
| `diagnosing-bugs` | 12 | 22 |
| `writing-for-agents` | 3 | 6 |
| `research` | 2 | 5 |
| `code-review` | 2 | 4 |
| `domain-modeling` | 1 | 2 |
| `tdd` | 1 | 1 |
| `codebase-design` | 1 | 1 |

At least one Matt skill loaded in **14/25 sessions**. No explicit Matt slash-command/expanded-skill invocations were observed. Natural-language requests triggered the loads. No loads were observed for `retro`, `implement`, `grill-with-docs`, `grilling`, `to-spec`, `to-tickets`, `wayfinder`, `triage`, `handoff`, `ask-matt`, or `resolving-merge-conflicts`.

Adjacent usage: `frontend-design` in five sessions; `animate`, `herdr`, and your `pi-code-review` adapter in one each. You explicitly used the non-Matt `bro` skill in two sessions.

Interpretation: your recent pattern is direct requests, UI iteration and bug repair, often followed by local inspection and integration/deployment requests. You are using Matt's automatic reference skills much more than his named end-to-end planning flow. This sample does not establish your longer-term habits.

## Recommendations, in priority order

1. **Make `/retro` the small post-fix habit.** After a difficult fix, before clearing the session, ask for the single most useful prevention: a deterministic regression check, missing navigation pointer, or clearer environment access. Diagnosis appears in 12 sessions; retro in none. You already have exactly the promoted version, so this is a workflow change, not an installation need. Avoid converting mechanical mistakes into more prose rules.
2. **Use `/implement` selectively for bounded changes.** Your sample has much more diagnosis than visible TDD/review skill loading. A bounded ticket through `implement` supplies the test-first and two-axis-review close-out you otherwise have to remember. For Pi independent reviewers, keep using your existing `pi-code-review` adapter. Low load counts do not imply no tests or reviews happened.
3. **Pilot `implement-spec` on one approved multi-ticket build, not routine UI fixes.** Your repositories already use parent integration branches, child worktrees and Linear blocking relations, which closely match its task-graph approach. It could reduce manual dispatch and assembly. Before adopting it, provide a Pi execution adapter and make human merge approval, safe branch recovery, runtime isolation, native ticket claims and delayed cleanup explicit. The upstream instruction to reset a wrongly based branch must not discard another session's work. XR specifically disallows assuming parallel runtimes are isolated. Do not let the generic skill close tickets earlier than the repository permits.
4. **Consider adding `pr` for PR-heavy repositories.** Its short visual summary, before/after evidence and rollback/blast-radius assessment fit your UI work and make review more concrete. It is less valuable for local-only changes or XR flows where PRs are optional. This skill formats a PR body; it does not replace review or authorize a PR/merge.
5. **Keep communication plain by default.** The two explicit `bro` invocations are a stronger signal than any new release feature. Keep that escape hatch. `wait-what` now uses the renamed glossary, but otherwise already matched upstream; it is an alternative, not a reason to replace `bro`.

Suggested lightweight loop: direct request or short `grill-with-docs` when terminology is unclear → `implement` (or diagnosis for a bug) → independent review → human-approved integration → `retro` before clearing. Reserve spec/ticket orchestration for work that genuinely needs it.

## Verification

- Complete installed-directory comparison: 22 retained upstream skills match v1.3.1.
- All five migration targets: glossary content unchanged; no old glossary/map references remain in tracked text; `git diff HEAD --check` passes.
- Shared installer: 40 skills linked; no conflicts reported.
- Input-monitor: `npm ci --ignore-scripts && npm run check:docs` passed (eight Markdown files, zero issues). The dependency install reported five high-severity audit findings in the locked tooling dependencies; no dependency remediation was attempted in this documentation migration.
- Application tests and full CI pipelines were not run: changes are documentation, a comment, and skill dependencies. No PR was opened or merge performed.

## Primary sources

- [v1.3.0 release](https://github.com/mattpocock/skills/releases/tag/v1.3.0)
- [v1.3.1 release](https://github.com/mattpocock/skills/releases/tag/v1.3.1)
- [Exact v1.3.0 → v1.3.1 delta](https://github.com/mattpocock/skills/compare/v1.3.0...v1.3.1)
- [Tagged skills tree](https://github.com/mattpocock/skills/tree/v1.3.1/skills)
- [Setup](https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering/setup-matt-pocock-skills)
- [Implement spec](https://github.com/mattpocock/skills/blob/v1.3.1/skills/engineering/implement-spec/SKILL.md)
- [Retro](https://github.com/mattpocock/skills/blob/v1.3.1/skills/engineering/retro/SKILL.md)
- [PR](https://github.com/mattpocock/skills/blob/v1.3.1/skills/engineering/pr/SKILL.md)
