# CB Skills

The coding-agent skills I use across machines. This repository is the source of
truth for agents that respect `.agents` (including Codex) and Claude Code.

Third-party skills are managed by the [Skills CLI](https://github.com/vercel-labs/skills) and recorded in
`skills-lock.json`. My own skills (and vendored skills if necessary) remain committed here.

## Install

```bash
# 1. Install third-party skills into this repo:
npx --yes skills@latest experimental_install
# 2. Then create the global symlinks for the agents:
./scripts/install.sh
```

The installer creates one symlink per skill in:

- `~/.agents/skills`
- `~/.claude/skills`

It refuses to overwrite a real file or directory. Existing symlinks are updated
to point at this checkout, and obsolete symlinks owned by this checkout are
removed.

## Add new third-party skills or update them

Run project-scoped Skills CLI commands from this repository:

```bash
npx --yes skills@latest add <owner>/<repository> --skill skill-name -y
npx --yes skills@latest update -p
```

After adding or removing a skill, rerun the installer to create or clean up its
global symlinks:

```bash
./scripts/install.sh
```

Updating an existing skill does not require rerunning the installer because its
symlinks already point into this checkout. Start a new agent session after
adding a skill so the agent discovers it.

Review installed skills before using them, then commit the updated
`skills-lock.json`. Files under `.agents/skills` are installed dependencies and
are intentionally ignored by Git.

Do not use global add, update, or remove commands for this collection. Global
commands manage the same directories that `scripts/install.sh` links to this
checkout.

## Repository-owned skills

- `codex-plan-review` is maintained in this repository.
- `tldraw-offline-wsl` bridges WSL agents to the official skill installed by
  tldraw Offline on Windows.
