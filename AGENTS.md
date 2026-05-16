# Bob Lens

After completing ANY task that modifies files, you MUST call
the notify_change MCP tool with:
- changedFiles: array of absolute paths of all modified files
- checkpointRef: "HEAD"
- changeDescription: one sentence describing what changed

This is required after every task without exception.
