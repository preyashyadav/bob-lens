import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createPatch } from 'diff';
const execAsync = promisify(exec);
// In-memory storage for changes (could be replaced with a database)
const changeSetStorage = new Map();
export async function trackChange(input) {
    const changeId = generateChangeId();
    const workspaceRoot = process.env.WORKSPACE_PATH ?? process.cwd();
    // Process each file to get before/after content and generate diff
    const changes = await Promise.all(input.changedFiles.map(async (filePath) => {
        // 1. Read AFTER state from disk
        const afterContent = await readAfterContent(filePath);
        // 2. Read BEFORE state from Bob's checkpoint
        const beforeContent = await readBeforeContent(filePath, input.checkpointRef, workspaceRoot);
        // 3. Classify file type
        const fileType = classifyFileType(filePath);
        // 4. Generate unified diff
        const diffStr = createPatch(filePath, beforeContent, afterContent);
        return {
            filePath,
            before: beforeContent,
            after: afterContent,
            diff: diffStr,
            fileType,
            timestamp: new Date().toISOString(),
        };
    }));
    const changeSet = {
        id: changeId,
        checkpointRef: input.checkpointRef,
        changes,
        description: input.description,
        timestamp: new Date().toISOString(),
    };
    changeSetStorage.set(changeId, changeSet);
    console.error(`Tracked change ${changeId} with ${input.changedFiles.length} files`);
    return changeSet;
}
/**
 * Read AFTER state from disk
 */
async function readAfterContent(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    }
    catch (error) {
        // File doesn't exist (deleted), return empty string
        return '';
    }
}
/**
 * Read BEFORE state from Bob's checkpoint using git show
 */
async function readBeforeContent(filePath, checkpointRef, workspaceRoot) {
    try {
        const relativeFilePath = path.relative(workspaceRoot, filePath);
        const command = `git -C ${workspaceRoot} show ${checkpointRef}:${relativeFilePath}`;
        const { stdout } = await execAsync(command);
        return stdout;
    }
    catch (error) {
        // File wasn't tracked or checkpoint doesn't exist, return empty string
        return '';
    }
}
/**
 * Classify file type based on extension and path
 */
function classifyFileType(filePath) {
    const ext = path.extname(filePath);
    const normalizedPath = filePath.toLowerCase();
    // Frontend: .jsx, .tsx, .css, .scss OR path includes /components/
    if (['.jsx', '.tsx', '.css', '.scss'].includes(ext) ||
        normalizedPath.includes('/components/')) {
        return 'frontend';
    }
    // Backend: .js or .ts AND path includes /api/, /routes/, /controllers/, /services/
    if (['.js', '.ts'].includes(ext) &&
        (normalizedPath.includes('/api/') ||
            normalizedPath.includes('/routes/') ||
            normalizedPath.includes('/controllers/') ||
            normalizedPath.includes('/services/'))) {
        return 'backend';
    }
    // Everything else is config
    return 'config';
}
export function getChange(changeId) {
    return changeSetStorage.get(changeId);
}
export function getAllChanges() {
    return Array.from(changeSetStorage.values());
}
function generateChangeId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// Made with Bob
