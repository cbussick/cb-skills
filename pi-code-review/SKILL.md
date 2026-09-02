---
name: pi-code-review
description: Run Matt Pocock's two-axis code review with isolated Pi child processes. Use when the user asks Pi to have independent agents review a branch, diff, pull request, or work-in-progress changes.
---

# Pi Code Review

Adapt Matt Pocock's installed `code-review` skill to Pi. His skill defines the review; this skill only supplies Pi's missing subagent mechanism.

## Process

1. Read `~/.agents/skills/code-review/SKILL.md` completely.
2. Follow it through preparation of the Standards and Spec prompts.
3. Replace its subagent step with the process below.
4. After both children finish, follow its aggregation instructions.

## Run the reviewers

Write each complete prompt to a temporary Markdown file. Create separate output and error files. Use file tools so prompt text never becomes shell syntax.

Start both reviewers concurrently from the current repository:

```bash
pi --no-session --no-skills \
  --tools read,bash,grep,find,ls \
  -p @<standards-prompt> \
  > <standards-output> 2> <standards-error> &
standards_pid=$!

pi --no-session --no-skills \
  --tools read,bash,grep,find,ls \
  -p @<spec-prompt> \
  > <spec-output> 2> <spec-error> &
spec_pid=$!

standards_status=0
spec_status=0
wait "$standards_pid" || standards_status=$?
wait "$spec_pid" || spec_status=$?
```

When the source skill says no specification is available, run only the Standards child.

Read each output file completely. On failure, report that child's exit status and stderr; do not present it as a completed independent review. Delete all temporary files after reading them.

## Report

Verify every material finding against the repository. Then use the source skill's aggregation format, keeping Standards and Spec separate.

State that isolated Pi processes produced the independent reviews.
