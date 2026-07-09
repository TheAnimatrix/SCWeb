#!/bin/sh
set -eu

API_PID=

cleanup() {
	if [ -n "${API_PID:-}" ]; then
		kill "$API_PID" 2>/dev/null || true
		wait "$API_PID" 2>/dev/null || true
	fi
}

trap cleanup TERM INT

export API_PORT="${API_PORT:-3001}"
export PORT="$API_PORT"
export HOST="${HOST:-0.0.0.0}"

node api/dist/server.js &
API_PID=$!

i=0
while [ "$i" -lt 30 ]; do
	if wget -q --spider "http://127.0.0.1:${API_PORT}/health" 2>/dev/null; then
		break
	fi
	i=$((i + 1))
	sleep 1
done

if ! wget -q --spider "http://127.0.0.1:${API_PORT}/health" 2>/dev/null; then
	echo "API health check failed after 30s" >&2
	exit 1
fi

export PORT=3000
export HOST=0.0.0.0
# Always proxy to the co-located API — never the public api.* hostname (hairpin/streaming breaks uploads).
export API_ORIGIN=http://127.0.0.1:3001
# SvelteKit adapter-node defaults to 512K; STL uploads allow up to 50MB (+ multipart overhead).
: "${BODY_SIZE_LIMIT:=55M}"
export BODY_SIZE_LIMIT

exec node build/index.js
