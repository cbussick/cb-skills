#!/usr/bin/env bash

set -euo pipefail

windowsCmd="/mnt/c/Windows/System32/cmd.exe"
windowsCurl="/mnt/c/Windows/System32/curl.exe"

fail() {
  echo "tldraw-offline-wsl: $*" >&2
  exit 1
}

usage() {
  cat >&2 <<EOF
Usage:
  $0 skill-path
  $0 METHOD /api/path [body]

Pass longer request bodies on stdin.
EOF
  exit 2
}

[[ -x $windowsCmd ]] || fail "Windows cmd.exe is unavailable; WSL interoperability is required."
command -v wslpath >/dev/null 2>&1 || fail "wslpath is unavailable."

windowsEnvironment() {
  local name=$1
  "$windowsCmd" /d /c "echo %${name}%" 2>/dev/null | tr -d '\r'
}

windowsUserProfile=$(windowsEnvironment USERPROFILE)
[[ -n $windowsUserProfile ]] || fail "could not discover the Windows user profile."

if [[ ${1:-} == "skill-path" ]]; then
  (($# == 1)) || usage

  candidates=(
    "${windowsUserProfile}\\.codex\\skills\\tldraw-offline\\SKILL.md"
    "${windowsUserProfile}\\.claude\\skills\\tldraw-offline\\SKILL.md"
  )

  for candidate in "${candidates[@]}"; do
    candidateWsl=$(wslpath -u "$candidate")
    if [[ -f $candidateWsl ]]; then
      printf '%s\n' "$candidateWsl"
      exit 0
    fi
  done

  fail "the official tldraw-offline skill is not installed in the Windows agent directories."
fi

(($# >= 2 && $# <= 3)) || usage
[[ -x $windowsCurl ]] || fail "Windows curl.exe is unavailable."
command -v node >/dev/null 2>&1 || fail "Node.js is required in WSL."

method=${1^^}
apiPath=$2
[[ $method =~ ^(GET|POST|PUT|PATCH|DELETE|HEAD)$ ]] || fail "unsupported HTTP method: $method"
[[ $apiPath == /* ]] || fail "API path must begin with /."

windowsAppData=$(windowsEnvironment APPDATA)
[[ -n $windowsAppData ]] || fail "could not discover Windows AppData."
serverJson=$(wslpath -u "${windowsAppData}\\tldraw\\server.json")
[[ -f $serverJson ]] || fail "tldraw Offline is not running or server.json is unavailable."

connection=$(node -e '
  const fs = require("fs")
  const config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  if (!config.port || !config.token) process.exit(1)
  process.stdout.write(`${config.port}\n${config.token}`)
' "$serverJson") || fail "server.json does not contain a valid port and token."

[[ $connection == *$'\n'* ]] || fail "could not parse the tldraw connection details."
port=${connection%%$'\n'*}
token=${connection#*$'\n'}

url="http://127.0.0.1:${port}${apiPath}"
curlArgs=(
  -sS
  --fail-with-body
  -X "$method"
  "$url"
  -H "authorization: Bearer $token"
)

if [[ $method != "GET" && $method != "HEAD" ]]; then
  if (($# == 3)); then
    body=$3
  else
    body=$(cat)
  fi

  if [[ $body == \{* ]]; then
    contentType="application/json"
  else
    contentType="text/plain"
  fi

  printf '%s' "$body" | "$windowsCurl" "${curlArgs[@]}" \
    -H "content-type: $contentType" \
    --data-binary @-
else
  "$windowsCurl" "${curlArgs[@]}"
fi
