---
name: spawn-agent
description: Spawn another Pi agent and give it a task.
disable-model-invocation: true
---

# Spawn Agent

Create a **new** Pi agent for the task the caller supplies. Preserve the task, permissions, and requested output; ask for a task if none was given.

Default to a one-shot child. Create a persistent Herdr agent only when the caller asks for one or wants a continuing conversation.

## One-shot child

1. Write the task to a temporary Markdown file and reserve a temporary output file, so the task never becomes shell syntax.
2. From the current working directory, run `pi --no-session -p @<task-file> > <output-file>`. Add model or tool flags only if the caller specifies them.
3. Read the full response; on failure, report the exit status and stderr. Delete both temporary files, then attribute the answer to the spawned agent.

## Persistent agent

Requires `HERDR_ENV=1`; otherwise offer the one-shot option. Follow the installed `herdr` skill (or `herdr --skill` if unavailable) to create a Pi agent in a sibling pane without stealing focus, send the task, wait, and read its reply. Report its name and pane ID, and leave it running for follow-up.

Give concurrent agents that write to the same repository separate worktrees.
