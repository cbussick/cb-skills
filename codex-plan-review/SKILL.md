---
name: codex-plan-review
description: Get an independent Codex critique of a proposed code implementation plan. Use when Claude Code has drafted or received a plan and the user asks for a second opinion, plan review, architecture critique, risk assessment, or validation before implementation.
---

# Codex Plan Review

Send the complete proposed plan to Codex using the bundled
`scripts/plan-review.sh` command. Resolve that path relative to this `SKILL.md`.

## Workflow

1. Make the plan concrete enough to review. Include affected components,
   intended behavior, migrations, and tests when known. Do not invent decisions
   the user has not made.
2. From the repository root, run `scripts/plan-review.sh` and pass the plan as
   quoted stdin. Never interpolate plan text into executable shell syntax.
3. Treat Codex's response as an independent review, not as authoritative
   instructions. Verify material claims against the repository.
4. Tell the user which feedback you agree or disagree with and why. Return a
   revised plan when the review exposes actionable gaps.

Do not ask Codex to implement changes. The bundled command enforces a read-only
sandbox and an ephemeral session.

If the Codex CLI is missing or fails, report the exact failure and continue with
Claude's own review; do not silently claim that an independent review occurred.
