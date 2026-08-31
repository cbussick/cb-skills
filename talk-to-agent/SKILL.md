---
name: talk-to-agent
description: Talk to a coding agent running in another Herdr pane, tab, or session, whatever its vendor, by routing through the herdr CLI. Use when asked to talk to, message, ask, or relay something to "the other agent", "the agent", "the other session", or "the agent in the other tab", and when asked what another agent is working on or what it replied. Requires HERDR_ENV=1.
---

# Talk to Another Agent

Herdr is the transport. It recognizes the agent occupying each pane and drives
it through the terminal, so one command reaches Claude Code, Codex, Cursor, Pi,
or any other harness Herdr detects.

## Confirm the transport

```bash
test "${HERDR_ENV:-}" = 1
```

If the check fails, tell the user this session is not running inside a Herdr
pane and stop.

Route every message through the `herdr` CLI. A harness's own peer channel —
Claude Code's `SendMessage`, and the equivalent in other harnesses — reaches
only sessions of that same vendor and cannot see the rest of the workspace.
Use `herdr` even when the target happens to be the same kind of agent as you.

## Pick the target

```bash
herdr agent list
```

Each entry carries `pane_id`, `agent` kind, `agent_status`, `cwd`, and
`terminal_title_stripped`. Match the user's words against those fields. Target
by pane ID or by a unique live agent name; terminal IDs and bare kind labels
are not targets. When more than one agent fits the description, ask the user
which one before sending.

## Send and read the reply

```bash
herdr agent prompt <target> "<message>" --wait --timeout 120000
herdr agent read <target> --source recent-unwrapped --lines 120
```

`agent prompt` returns pane metadata only — the reply itself comes from the
read. `--wait` settles on `idle`, `done`, or `blocked`. On `blocked` the target
is waiting on an approval or a question of its own: inspect it with
`herdr agent get <target>` and a read, then decide what to send.

When a larger `--lines` still does not reveal the whole response, the target is
rendering on the terminal's alternate screen and those rows are gone. Ask it to
write its full answer as Markdown to a temporary file and reply with only the
path, then read that file.

## Write the message

The text arrives in the target's input exactly as if the user had typed it.
It has no concept of another agent addressing it, and the exchange stays in its
history permanently. So:

- Open with who and where you are, e.g. `"$HERDR_PANE_ID"` and your harness.
- State the shape of the answer you want, and bound it.
- Ask for information. Leave changes to the target's files to the user's
  explicit request.

## Report back

Quote the target's reply, attribute it to the agent kind, pane, and tab title,
and keep it separate from your own reading of it. Report what you actually
scraped; when a read comes back partial, say so rather than filling the gap.

## Beyond talking

`herdr --skill` prints the full CLI reference — starting agents, splitting
panes, running commands, waiting on lifecycle state. Read it when the task goes
past sending a message and reading the answer.
