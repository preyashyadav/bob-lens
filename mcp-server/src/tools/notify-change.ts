import { broadcastToUI } from '../services/websocket.js';
import { trackChange } from '../services/change-tracker.js';

interface NotifyChangeArgs {
  changedFiles?: string[];
  changes?: Array<{
    filePath: string;
    fileType?: string;
    before?: string;
    after?: string;
  }>;
  checkpointRef: string;
  changeDescription?: string;
}

export async function notifyChangeHandler(args: NotifyChangeArgs) {
  try {
    let changeId = '';
    let changeSet: any;
    let changesForBob: Array<{ filePath: string; fileType: string; before: string; after: string }> = [];

    if (args.changes && args.changes.length > 0) {
      changeId = generateChangeId();
      changesForBob = args.changes.map((c) => ({
        filePath: c.filePath,
        fileType: c.fileType ?? inferFileType(c.filePath),
        before: c.before ?? '',
        after: c.after ?? '',
      }));

      changeSet = {
        id: changeId,
        checkpointRef: args.checkpointRef,
        changes: changesForBob,
        description: args.changeDescription,
        timestamp: new Date().toISOString(),
      };
    } else if (args.changedFiles && args.changedFiles.length > 0) {
      // Track the change (reads before via git show checkpointRef:file, reads after from disk)
      changeSet = await trackChange({
        changedFiles: args.changedFiles,
        checkpointRef: args.checkpointRef,
        description: args.changeDescription,
      });
      changeId = changeSet.id;

      // Build the full changes array for Bob analysis
      changesForBob = (changeSet.changes ?? []).map((c: any) => ({
        filePath: c.filePath,
        fileType: c.fileType ?? inferFileType(c.filePath),
        before: c.before ?? '',
        after: c.after ?? '',
      }));
    } else {
      throw new Error('Either changes[] or changedFiles[] must be provided');
    }

    // Broadcast to UI via WebSocket with complete changeSet
    broadcastToUI({
      type: 'change_notification',
      data: changeSet,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Change notification sent to Bob Lens UI',
            changeId,
            changes: changesForBob,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `Failed to notify change: ${error.message}`,
            changeId: '',
          }, null, 2),
        },
      ],
    };
  }
}

function inferFileType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx') || lower.endsWith('.css') || lower.endsWith('.scss') || lower.includes('/components/')) {
    return 'frontend';
  }
  if ((lower.endsWith('.ts') || lower.endsWith('.js')) && (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') || lower.includes('/services/'))) {
    return 'backend';
  }
  return 'config';
}

function generateChangeId(): string {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Made with Bob
