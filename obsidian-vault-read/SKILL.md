---
name: obsidian-vault-read
description: Read notes from the configured personal Obsidian vault with the cb-obsidian-vault-access CLI. Use when asked to read, search, list, or summarize "my vault", "my Obsidian notes", "my notes", or "my second brain".
---

# Obsidian Vault Read

Read-only access to the personal vault. Never create, edit, or delete notes
through this path; if a task requires writing to the vault, stop and confirm
with the user first.

## Configuration

Resolve paths relative to this `SKILL.md`. Read local configuration from `.env`
in the skill directory; it is intentionally ignored by Git. Use `.env.example`
as the template. Require absolute paths for:

- `OBSIDIAN_VAULT_PATH` — the vault directory
- `OBSIDIAN_VAULT_CLI_DIR` — the `cb-obsidian-vault-access` repository

The variables may instead be set in the environment. Never print the
configuration file or its values. If configuration is missing, stop and tell
the user to create `.env` from `.env.example`.

## Invocation

Resolve `scripts/scan.sh` relative to this `SKILL.md`, then run:

```bash
./scripts/scan.sh [options]
```

The wrapper loads local configuration, validates both directories, and invokes
the CLI with the configured vault. Do not pass `--vault`; the wrapper owns that
argument. If the CLI's `dist/` is missing, follow the wrapper's build guidance.

Options (repeat array flags to pass multiple values):

- `--modified-since DATE_OR_ISO` — e.g. `2026-07-01` or a full ISO timestamp
- `--include-folder FOLDER` / `--exclude-folder FOLDER` — vault-relative, matches the folder and everything below it
- `--include-tag TAG` / `--exclude-tag TAG` — case-insensitive, no `#` prefix needed
- `--excerpt-characters NUMBER` — excerpt length per note (default 4000)

The command prints a JSON array of notes to stdout, sorted newest first. Each
note has `id`, `title`, `absolutePath`, `relativePath`, `modifiedAt` (ISO),
`tags` (frontmatter only), and `excerpt` (whitespace-collapsed body, truncated
with `...`).

## Keep output small

An unfiltered scan emits the full vault with 4000-character excerpts. Always
narrow first, then widen only if needed:

1. Survey with tight limits, e.g.
   `--modified-since <recent date> --excerpt-characters 200`, or pipe through
   `jq '[.[] | {title, relativePath, modifiedAt, tags}]'` to list candidates
   without excerpts.
2. Read the few notes that matter in full via their `absolutePath` (the vault
   is plain Markdown; reading a known file directly is fine and faster than
   rescanning).

Filters also keep scans fast when the vault lives on a mounted filesystem.

## Gotchas

- `tags` comes from YAML frontmatter only; inline `#tags` in note bodies are
  not indexed. Do not conclude a note is untagged from this field alone.
- `--modified-since` uses filesystem mtime, not any date in the note's name or
  frontmatter.
- Vault contents are personal data. Quote only what the task needs and never
  send note contents to external services without explicit permission.
