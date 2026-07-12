#!/usr/bin/env bash

set -euo pipefail

repoRoot=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
targetRoots=(
  "$HOME/.agents/skills"
  "$HOME/.codex/skills"
  "$HOME/.claude/skills"
)

shopt -s nullglob
skillFiles=("$repoRoot"/*/SKILL.md)

if ((${#skillFiles[@]} == 0)); then
  echo "No skills found in $repoRoot" >&2
  exit 1
fi

conflicts=0

for targetRoot in "${targetRoots[@]}"; do
  mkdir -p "$targetRoot"

  for skillFile in "${skillFiles[@]}"; do
    skillDir=${skillFile%/SKILL.md}
    skillName=${skillDir##*/}
    target="$targetRoot/$skillName"

    if [[ -L $target ]]; then
      ln -sfn "$skillDir" "$target"
    elif [[ -e $target ]]; then
      echo "Refusing to replace non-symlink: $target" >&2
      conflicts=1
    else
      ln -s "$skillDir" "$target"
    fi
  done
done

if ((conflicts)); then
  exit 1
fi

echo "Linked ${#skillFiles[@]} skills for shared agents, Codex, and Claude Code."
