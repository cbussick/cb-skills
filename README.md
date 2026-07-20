# CB Skills

The shared coding-agent skills I use across machines. This repository is the
source of truth for Codex, Claude Code, and other agents that support `.agents`.

Third-party skills are managed by the
[Skills CLI](https://github.com/vercel-labs/skills) and recorded in
`skills-lock.json`. Repository-owned skills live in top-level directories
containing a `SKILL.md`.

## Install

```bash
# 1. Install third-party skills into .agents/skills based on `skills-lock.json`:
npx --yes skills@latest experimental_install

# 2. Create global symlinks for the agents:
./scripts/install.sh
```

The installer creates one symlink per skill in:

- `~/.agents/skills`
- `~/.claude/skills`

It refuses to overwrite a real file or directory. Existing symlinks are updated
to point at this checkout, and obsolete symlinks owned by this checkout are
removed.

Start a new agent session after adding a skill so the agent discovers it.

## Manage third-party skills

Run project-scoped Skills CLI commands from this repository:

```bash
# Add:
npx --yes skills@latest add <owner>/<repository> --skill <skill-name> -y

# Update:
npx --yes skills@latest update -p

# Remove:
npx --yes skills@latest remove <skill-name> -y
```

After adding or removing a skill, rerun `./scripts/install.sh` to create or
clean up its global symlinks. Updating an existing skill does not require this
because its symlinks already point into the checkout.

Review installed skills before using them, then commit the updated
`skills-lock.json`. Files under `.agents/skills` are installed dependencies and
are intentionally ignored by Git.

Do not use global add, update, or remove commands for this collection. Global
commands manage the same directories that `scripts/install.sh` links to this
checkout.

## Manage repository-owned skills

Add or edit repository-owned skills as top-level directories containing a
`SKILL.md`, and commit them normally. After adding or removing one, rerun
`./scripts/install.sh`.
