# CB Skills

The coding-agent skills I use across machines. This repository is the source of
truth for both Codex and Claude Code.

Most skills are vendored from third-party repositories so that a fresh machine
gets the exact reviewed versions committed here. `codex-plan-review` is maintained
in this repository. See [VENDORED.md](VENDORED.md) for upstream sources and the
vendored skill inventory.

## Install

Run:

```bash
./scripts/install.sh
```

The installer creates one symlink per skill in:

- `~/.agents/skills`
- `~/.codex/skills`
- `~/.claude/skills`

It refuses to overwrite a real file or directory. Existing symlinks are updated
to point at this checkout.

## Updating vendored skills

Update vendored skills deliberately: fetch them from the upstream repository,
replace the corresponding directory here, inspect the Git diff, and commit the
reviewed result. Do not run `npx skills update -g` against this installation: the
CLI may replace the canonical symlinks under `~/.agents/skills` with copied files.

Upstream projects retain ownership and licensing of their vendored files. Keep
their notices and license files when refreshing a skill.
