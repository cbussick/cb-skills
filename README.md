# CB Skills

The coding-agent skills I use across machines. This repository is the source of
truth for both Codex and Claude Code.

Third-party skills are managed by the Skills CLI and recorded in
`skills-lock.json`. Repository-owned skills remain committed here.

## Install

Restore third-party skills, then create the global links:

```bash
npx --yes skills@latest experimental_install
./scripts/install.sh
```

The installer creates one symlink per skill in:

- `~/.agents/skills`
- `~/.codex/skills`
- `~/.claude/skills`

It refuses to overwrite a real file or directory. Existing symlinks are updated
to point at this checkout, and obsolete symlinks owned by this checkout are
removed.

## Add or update third-party skills

Run project-scoped Skills CLI commands from this repository:

```bash
npx --yes skills@latest add owner/repository --skill skill-name --agent codex -y
npx --yes skills@latest update -p
```

Review installed skills before using them, then commit the updated
`skills-lock.json`. Files under `.agents/skills` are installed dependencies and
are intentionally ignored by Git.

Do not use global add, update, or remove commands for this collection. Global
commands manage the same directories that `scripts/install.sh` links to this
checkout.

## Repository-owned skills

- `codex-plan-review` is maintained in this repository.
