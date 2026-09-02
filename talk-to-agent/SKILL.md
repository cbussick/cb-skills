---
name: talk-to-agent
description: Contact an already-running coding agent in another Herdr pane, tab, or session, including through an existing SSH terminal. Use only when the target agent already exists and the user wants to send it a message or read its reply. Requires HERDR_ENV=1.
---

# Talk to Another Agent

Herdr is the transport. It can address a recognized agent directly or operate
the terminal pane that contains an agent hidden behind SSH.

## Confirm the transport

```bash
test "${HERDR_ENV:-}" = 1
```

If the check fails, tell the user this session is not running inside a Herdr
pane and stop.

Route every message through the `herdr` CLI. A harness's own peer channel
reaches only sessions of that harness and cannot see the rest of the workspace.

## Resolve one target

```bash
herdr workspace list
herdr tab list --workspace "$HERDR_WORKSPACE_ID"
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

Match the user's description against workspace and tab labels, pane and tab
IDs, agent kind and status, working directory, and terminal title. A tab label
identifies a tab, so map its tab ID to the pane before sending.

Stay in the current workspace unless the user explicitly names another one.
The target must resolve uniquely. When multiple panes fit, ask the user which
one they mean before sending. Do not probe candidates with messages.

## Choose the transport

### Recognized agent

When `herdr agent list` associates the target pane with an agent, use the agent
interface:

```bash
herdr agent prompt <target> "<message>" --wait --timeout 120000
herdr agent read <target> --source recent-unwrapped --lines 120
```

`agent prompt` returns pane metadata; the reply comes from the read. On
`blocked`, inspect the target with `herdr agent get <target>` and another read
before deciding what to send.

### Opaque pane, including an agent behind SSH

An agent inside SSH can appear in `herdr pane list` with `agent_status:
unknown` and no recognized agent identity. Herdr can still operate its local
terminal pane.

Read the uniquely selected pane first and confirm that its visible foreground
application is the intended coding-agent interface:

```bash
herdr pane read <pane-id> --source recent-unwrapped --lines 120
```

Then submit the message as terminal input and read the same pane:

```bash
herdr pane run <pane-id> "<message>"
herdr pane read <pane-id> --source recent-unwrapped --lines 120
```

The existing SSH connection carries the input to the remote agent. If the pane
is at a shell prompt instead of the intended agent, stop and report that the
agent is not active. Starting a command on the remote host requires the user's
explicit request.

Allow the target time to respond. If its response is still in progress, repeat
the read rather than resubmitting the prompt.

## Write the message

The text arrives exactly as if the user typed it, and the exchange remains in
the target's history.

- Open with your harness and `"$HERDR_PANE_ID"`.
- State why you are contacting it.
- Request a bounded answer.
- Ask for information unless the user explicitly authorizes changes.

## Read and report the reply

When a larger `--lines` still does not reveal the whole response, the target is
rendering on the terminal's alternate screen and those rows are gone. Ask it to
write its full answer as Markdown to a temporary file and reply with only the
path, then read that file.

Quote or accurately summarize only the response visible in the target pane.
Attribute it to the agent kind when known, pane ID, and tab label. State when
the reply is partial or Herdr identifies the target only as an opaque pane.
Keep unrelated terminal history, login details, addresses, tokens, and other
sensitive output out of the report.

## Beyond talking

`herdr --skill` prints the full CLI reference. Read it when the task goes past
sending a message and reading the answer.
