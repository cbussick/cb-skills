#!/usr/bin/env bash
set -euo pipefail

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
revision=$(tr -d '\r\n' < "$skill_dir/upstream-revision")
upstream=https://github.com/ivarvong/lantern.git
home=${LANTERN_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/lantern}
install="$home/$revision"

fail() { printf 'lantern: %s\n' "$*" >&2; exit 1; }
usage() {
  printf '%s\n' \
    'Usage: lantern.sh setup | path | new DIRECTORY | browser' \
    '  setup          Install the pinned source and locked npm dependencies.' \
    '  path           Print the installed source directory.' \
    '  new DIRECTORY  Create an independent workspace; destination must not exist.' \
    '  browser        Install Chromium for the pinned Playwright browser tools.' \
    'Requires Bash, Git, Node.js 24+, npm, and tar. LANTERN_HOME overrides storage.'
}

[[ $revision =~ ^[0-9a-f]{40}$ ]] || fail 'Invalid upstream-revision file.'
[[ $home == /* ]] || fail 'LANTERN_HOME / XDG_DATA_HOME must resolve to an absolute path.'

require_runtime() {
  local tool
  for tool in git node npm tar; do
    command -v "$tool" >/dev/null 2>&1 || fail "Missing prerequisite: $tool"
  done
  node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)' \
    || fail 'Use Node.js 24 or newer (for native TypeScript execution).'
  check_path "$install"
}

check_path() {
  # Upstream build tools use URL.pathname as a filesystem path without decoding.
  node --input-type=module -e '
    import { resolve } from "node:path";
    import { pathToFileURL } from "node:url";
    const path = resolve(process.argv[1]);
    if (pathToFileURL(path).pathname !== path) process.exit(1);
  ' "$1" || fail "Upstream requires a URL-safe path (no spaces, #, %, or non-ASCII characters): $1"
}

check_source() {
  [[ -d $install/.git ]] || fail "Not installed. Run: bash \"$skill_dir/scripts/lantern.sh\" setup"
  [[ $(git -C "$install" rev-parse HEAD) == "$revision" ]] \
    || fail "Installed checkout has the wrong revision: $install"
  [[ -z $(git -C "$install" status --porcelain) ]] \
    || fail "Installed checkout has local changes. Preserve them before setup: $install"
}

setup() {
  require_runtime
  if [[ -e $install || -L $install ]]; then
    check_source
    (cd "$install" && npm ci --no-audit --no-fund) >&2
  else
    mkdir -p "$home"
    staging=$(mktemp -d "$home/.install.XXXXXX")
    # Only this task's staging directory is removed on failure.
    trap 'rm -rf -- "$staging"' EXIT
    git clone --quiet --no-checkout "$upstream" "$staging/source" >&2
    git -C "$staging/source" checkout --quiet --detach "$revision" >&2
    (cd "$staging/source" && npm ci --no-audit --no-fund) >&2
    mv "$staging/source" "$install"
    rmdir "$staging"
    trap - EXIT
  fi
  printf '%s\n' "$install"
}

case ${1:-help} in
  setup)
    [[ $# == 1 ]] || fail 'setup takes no arguments.'
    setup
    ;;
  path)
    [[ $# == 1 ]] || fail 'path takes no arguments.'
    check_source
    printf '%s\n' "$install"
    ;;
  new)
    [[ $# == 2 && -n $2 ]] || fail 'Usage: lantern.sh new DIRECTORY'
    require_runtime
    check_source
    destination=$2
    check_path "$destination"
    [[ ! -e $destination && ! -L $destination ]] \
      || fail "Refusing to replace an existing destination: $destination"
    mkdir -p "$destination"
    destination=$(cd "$destination" && pwd)
    # Copy committed files only: no .git, shared node_modules, or generated output.
    git -C "$install" archive "$revision" | tar -x -C "$destination"
    (cd "$destination" && npm ci --no-audit --no-fund) >&2
    printf '%s\n' "$destination"
    ;;
  browser)
    [[ $# == 1 ]] || fail 'browser takes no arguments.'
    require_runtime
    check_source
    [[ -d $install/node_modules/playwright-core ]] || fail 'Run setup first to install dependencies.'
    # Keep browsers installed by other projects, even when Playwright calls them unused.
    (cd "$install" && PLAYWRIGHT_SKIP_BROWSER_GC=1 npm exec --no -- playwright-core install chromium)
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
