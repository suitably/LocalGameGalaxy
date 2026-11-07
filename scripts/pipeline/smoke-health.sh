#!/usr/bin/env bash
# Starts a server command in the background and checks its /health endpoint (#591).
# Usage: scripts/pipeline/smoke-health.sh <port> <command> [args...]
# Exits non-zero when /health does not answer {"status":"ok"} within SMOKE_TIMEOUT seconds (30).
# The command runs in a fresh temporary directory, so no config or data of the checkout is used.
set -u

port="${1:?port missing}"
shift
[ "$#" -gt 0 ] || { echo "smoke-health: command missing" >&2; exit 2; }
timeout_sec="${SMOKE_TIMEOUT:-30}"

workdir="$(mktemp -d)"
log="$workdir/server.log"
cmd="$1"
shift
# resolve a relative command before changing into the temp dir
case "$cmd" in
  */*) cmd="$(cd "$(dirname "$cmd")" && pwd)/$(basename "$cmd")" ;;
esac

(cd "$workdir" && PORT="$port" exec "$cmd" "$@") >"$log" 2>&1 &
pid=$!

cleanup() {
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
  rm -rf "$workdir"
}
trap cleanup EXIT

for _ in $(seq 1 "$timeout_sec"); do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "smoke-health: the server exited before /health answered" >&2
    tail -n 40 "$log" >&2
    exit 1
  fi
  body="$(curl -fsS "http://127.0.0.1:$port/health" 2>/dev/null || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then
    echo "smoke-health: /health ok on port $port"
    exit 0
  fi
  sleep 1
done

echo "smoke-health: /health did not answer within ${timeout_sec}s" >&2
tail -n 40 "$log" >&2
exit 1
