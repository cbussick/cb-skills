---
name: tldraw-offline-wsl
description: Bridge a coding agent running in WSL to the Windows tldraw Offline app and its installed official canvas skill. Use when inspecting, editing, arranging, connecting, linting, screenshotting, or scripting an open tldraw canvas from WSL.
---

# tldraw Offline from WSL

Use this skill only as the WSL transport adapter. Treat the skill installed by
tldraw Offline on the Windows side as the authoritative workflow and API guide.

## Start every task

1. Resolve this skill directory from this `SKILL.md`.
2. Run `scripts/tldraw-wsl.sh skill-path`.
3. Read the returned official `SKILL.md` completely before operating the
   canvas. If it is missing, ask the user to install the agent skill from
   tldraw Offline.
4. Follow the official skill's workflow, replacing its `tq` examples with this
   adapter:

```bash
scripts/tldraw-wsl.sh METHOD /api/path 'optional body'
```

The adapter discovers the Windows profile, current API port, and per-launch
token on every call. Never print the token or the contents of `server.json`.
Never edit an open `.tldraw` archive directly.

## Request examples

Read live API documentation:

```bash
scripts/tldraw-wsl.sh GET /readme
```

List open documents:

```bash
scripts/tldraw-wsl.sh POST /api/search \
  '{"code":"return await api.getDocs()"}'
```

Read the focused canvas:

```bash
scripts/tldraw-wsl.sh POST /api/search \
  '{"code":"const doc = await api.getFocusedDoc(); return doc ? await api.getShapes(doc.id) : null"}'
```

For longer request bodies, pass the body on stdin. Prefer the official skill's
read-edit-verify loop and stop after one successful verification.
