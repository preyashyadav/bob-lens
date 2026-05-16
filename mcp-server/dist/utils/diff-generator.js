export function generateDiff(before, after, filePath) {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const lines = [];
    let additions = 0;
    let deletions = 0;
    // Simple line-by-line diff (can be enhanced with proper diff algorithm)
    const maxLength = Math.max(beforeLines.length, afterLines.length);
    for (let i = 0; i < maxLength; i++) {
        const beforeLine = beforeLines[i];
        const afterLine = afterLines[i];
        if (beforeLine === afterLine) {
            lines.push({
                type: 'context',
                lineNumber: i + 1,
                content: beforeLine || '',
            });
        }
        else if (beforeLine && !afterLine) {
            lines.push({
                type: 'remove',
                lineNumber: i + 1,
                content: beforeLine,
            });
            deletions++;
        }
        else if (!beforeLine && afterLine) {
            lines.push({
                type: 'add',
                lineNumber: i + 1,
                content: afterLine,
            });
            additions++;
        }
        else if (beforeLine !== afterLine) {
            lines.push({
                type: 'remove',
                lineNumber: i + 1,
                content: beforeLine,
            });
            lines.push({
                type: 'add',
                lineNumber: i + 1,
                content: afterLine,
            });
            deletions++;
            additions++;
        }
    }
    return {
        filePath,
        lines,
        additions,
        deletions,
    };
}
// Made with Bob
