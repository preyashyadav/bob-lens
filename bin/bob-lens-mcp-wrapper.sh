#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOB_LENS_ROOT="$(dirname "$SCRIPT_DIR")"

while true; do
  node "$BOB_LENS_ROOT/mcp-server/dist/index.js" "$@"
  echo "MCP server restarting..." >&2
  sleep 3
done
