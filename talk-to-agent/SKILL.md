---
name: talk-to-agent
description: Contact an already-running coding agent in Herdr, including an agent on a saved remote machine. Use only when the user wants to send it a message or read its reply. Requires HERDR_ENV=1.
---

# Talk to Another Agent

1. Check `test "${HERDR_ENV:-}" = 1`. If it fails, explain that this session cannot control Herdr and stop.
2. Find the **existing** target using `herdr agent list` and, when needed, Herdr's workspace/tab/pane lists. Search the current workspace by default; include another workspace or saved machine when the user identifies one. Remote agents are eligible only when Herdr exposes them as recognized targets. Resolve the target uniquely by name or pane ID; ask when several agents match. Do not create an agent or send exploratory messages to identify one. If Herdr cannot identify the target as an agent, stop and explain.
3. Before sending, inspect the target's state; if working or blocked, read its output before deciding whether to send. Open your message with your harness and `$HERDR_PANE_ID`, say why you are contacting the agent, and ask for a bounded answer. Request information unless the user authorizes changes. Use `herdr agent prompt <target> "<message>" --wait --timeout 120000`.
4. Read the reply with `herdr agent read <target> --source recent-unwrapped --lines 120`. If still in progress, read again rather than resubmit. Attribute only what you can observe; say if the reply is partial. Keep unrelated terminal history and sensitive output out of the report.

For other Herdr operations or current command syntax, follow the installed `herdr` skill or `herdr --skill`.
