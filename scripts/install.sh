#!/usr/bin/env bash

set -euo pipefail

repoRoot=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
managedSkillsRoot="$repoRoot/.agents/skills"
lockFile="$repoRoot/skills-lock.json"
targetRoots=(
  "$HOME/.agents/skills"
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
)

shopt -s nullglob
skillFiles=(
  "$repoRoot"/*/SKILL.md
  "$managedSkillsRoot"/*/SKILL.md
)

if ((${#skillFiles[@]} == 0)); then
  echo "No skills found in $repoRoot" >&2
  exit 1
fi

if [[ -f $lockFile ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required to verify $lockFile" >&2
    exit 1
  fi

  missingSkills=$(node -e '
    const fs = require("fs");
    const path = require("path");
    const [lockFile, managedSkillsRoot] = process.argv.slice(1);
    const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    const missingSkills = Object.keys(lock.skills).filter(
      (skillName) => !fs.existsSync(path.join(managedSkillsRoot, skillName, "SKILL.md")),
    );
    process.stdout.write(missingSkills.join("\n"));
  ' "$lockFile" "$managedSkillsRoot")

  if [[ -n $missingSkills ]]; then
    echo "Restore locked skills before installing global links:" >&2
    printf '%s\n' "$missingSkills" >&2
    echo "Run: npx --yes skills@latest experimental_install" >&2
    exit 1
  fi
fi

skillDirs=()
skillNames=()

for skillFile in "${skillFiles[@]}"; do
  skillDir=${skillFile%/SKILL.md}
  skillName=${skillDir##*/}

  for existingSkillName in "${skillNames[@]}"; do
    if [[ $existingSkillName == "$skillName" ]]; then
      echo "Duplicate skill name: $skillName" >&2
      exit 1
    fi
  done

  skillNames+=("$skillName")
  skillDirs+=("$skillDir")
done

isCurrentSkill() {
  local candidateName=$1

  for skillName in "${skillNames[@]}"; do
    if [[ $skillName == "$candidateName" ]]; then
      return 0
    fi
  done

  return 1
}

conflicts=0

for targetRoot in "${targetRoots[@]}"; do
  mkdir -p "$targetRoot"

  existingTargets=("$targetRoot"/*)
  for existingTarget in "${existingTargets[@]}"; do
    if [[ ! -L $existingTarget ]]; then
      continue
    fi

    existingSource=$(readlink "$existingTarget")
    existingName=${existingTarget##*/}

    if [[ $existingSource == "$repoRoot/"* ]] && ! isCurrentSkill "$existingName"; then
      rm "$existingTarget"
    fi
  done

  for index in "${!skillNames[@]}"; do
    skillName=${skillNames[$index]}
    skillDir=${skillDirs[$index]}
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

echo "Linked ${#skillNames[@]} skills for shared agents, Codex, and Claude Code."
