#!/usr/bin/env bash

set -euo pipefail

skillRoot=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
configFile=${OBSIDIAN_VAULT_READ_CONFIG:-"$skillRoot/.env"}

if [[ -f $configFile ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$configFile"
  set +a
fi

if [[ -z ${OBSIDIAN_VAULT_PATH:-} || -z ${OBSIDIAN_VAULT_CLI_DIR:-} ]]; then
  echo "Missing Obsidian vault configuration." >&2
  echo "Copy $skillRoot/.env.example to $skillRoot/.env and set both paths." >&2
  exit 1
fi

if [[ $OBSIDIAN_VAULT_PATH != /* || $OBSIDIAN_VAULT_CLI_DIR != /* ]]; then
  echo "OBSIDIAN_VAULT_PATH and OBSIDIAN_VAULT_CLI_DIR must be absolute paths." >&2
  exit 1
fi

if [[ ! -d $OBSIDIAN_VAULT_PATH ]]; then
  echo "Configured Obsidian vault directory does not exist." >&2
  exit 1
fi

if [[ ! -d $OBSIDIAN_VAULT_CLI_DIR ]]; then
  echo "Configured cb-obsidian-vault-access directory does not exist." >&2
  exit 1
fi

for argument in "$@"; do
  if [[ $argument == --vault || $argument == --vault=* ]]; then
    echo "Do not pass --vault; configure OBSIDIAN_VAULT_PATH instead." >&2
    exit 1
  fi
done

cliEntry="$OBSIDIAN_VAULT_CLI_DIR/dist/cli.js"
if [[ ! -f $cliEntry ]]; then
  echo "The cb-obsidian-vault-access CLI is not built." >&2
  echo "Build it in the configured CLI directory before retrying." >&2
  exit 1
fi

cd "$OBSIDIAN_VAULT_CLI_DIR"
exec node "$cliEntry" scan --vault "$OBSIDIAN_VAULT_PATH" "$@"
