#!/bin/bash
while true; do
  node /Users/preyashyadav/Documents/personal-projects/bob-lens/mcp-server/dist/index.js "$@"
  echo "MCP server restarting..." >&2
  sleep 3
done
