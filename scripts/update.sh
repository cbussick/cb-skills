#!/usr/bin/env bash
set -euo pipefail

if (($#)); then
  echo "Usage: scripts/update.sh" >&2
  exit 2
fi

repoRoot=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repoRoot"

# An interrupted update may already have replaced some downloaded files.
# Restore our policy even if the CLI reports a failure.
updateStatus=0
npx --yes skills@latest update -p || updateStatus=$?
node "$repoRoot/scripts/apply-skill-policy.mjs"
if ((updateStatus)); then
  exit "$updateStatus"
fi

bash "$repoRoot/scripts/install.sh"
