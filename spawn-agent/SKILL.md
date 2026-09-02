---
name: spawn-agent
description: Spawn another Pi agent and give it a task.
disable-model-invocation: true
---

# Spawn Agent

Send the supplied task to a new Pi agent without changing its meaning. The caller defines the task, permissions, and expected result. Ask for a task if none was supplied.

Use a one-shot child by default. Use a persistent Herdr agent only when the caller asks for one or for continued conversation.

## One-shot child

1. Write the exact task to a temporary Markdown file. Create a temporary output file too. This avoids putting the task inside shell syntax.
2. From the caller's current working directory, run:

   ```bash
   pi --no-session -p @<task-file> > <output-file>
   ```

   Add model or tool flags only when the caller supplies them.
3. Read the complete output. On failure, report the exit status and stderr.
4. Delete the temporary files.
5. Return the answer and attribute it to the spawned Pi agent.

## Persistent Herdr agent

1. Check `test "${HERDR_ENV:-}" = 1`. If unavailable, ask whether to use a one-shot child.
2. Run `herdr --skill` and follow the installed CLI instructions.
3. Create a sibling pane in the current tab and working directory without changing focus. Choose the split direction from the current layout.
4. Parse its pane ID and start Pi with a useful unique name:

   ```bash
   herdr agent start <name> --kind pi --pane <pane-id>
   ```
5. Submit the task with shell-safe quoting and wait:

   ```bash
   herdr agent prompt <name> "<task>" --wait --timeout 120000
   ```
6. Read the response. If the agent is blocked or working, inspect its state rather than resubmitting.
7. Report the answer, agent name, and pane ID. Leave the agent open.

## Boundaries

- This skill always creates a new agent.
- Preserve the requested scope and output.
- Leave persistent panes open unless the caller asks to close them.
- Concurrent writing agents require separate worktrees.
