# Skill Repository Workflow

This repository is the source of truth for skills shared across agents. Read
the root `README.md` before changing skill dependencies or installation
behavior.

## Skill ownership

- Treat `.agents/skills/` as installed third-party dependencies. It is managed
  by the Skills CLI, ignored by Git, and must not be edited manually. The only
  generated overrides are applied by `scripts/apply-skill-policy.mjs`, according
  to `skills-policy.json`; see the root README's
  [local skill policy](../../README.md#local-skill-policy).
- Treat top-level directories containing `SKILL.md` as repository-owned or
  intentionally vendored skills. Edit and commit those directories normally.

## Third-party skills

- Run Skills CLI add, update, and restore commands from this repository so
  changes are recorded in `skills-lock.json`.
- After updates, follow the root README's
  [new-skill check](../../README.md#check-for-new-skills) when a source
  announces changes or during periodic maintenance. Updates refresh the locked
  skills; this separate check finds new and renamed skills.
- Do not use global Skills CLI add, update, or remove commands for this
  collection. They operate on the same global directories managed by this
  repository's installer.
- Review installed skill contents before using them and commit changes to
  `skills-lock.json`.

## Global links

- Run `./scripts/install.sh` after adding or removing a skill. The installer
  creates or removes links in `~/.agents/skills` and `~/.claude/skills`.
- Use `./scripts/update.sh` for updates. It reapplies policy and runs the
  installer. After direct Skills CLI updates or restores, rerun
  `./scripts/install.sh` before using an agent so invocation policy is restored.
- Do not replace non-symlink files or directories in the global skill roots.
  The installer intentionally treats them as conflicts.
- Start a new agent session after adding a skill so the agent discovers it.
