import { broadcastToUI } from '../services/websocket.js';
import { trackChange } from '../services/change-tracker.js';

interface NotifyChangeArgs {
  changedFiles: string[];
  checkpointRef: string;
  changeDescription?: string;
}

export async function notifyChangeHandler(args: NotifyChangeArgs) {
  try {
    // Track the change - now returns full ChangeSet object
    const changeSet = await trackChange({
      changedFiles: args.changedFiles,
      checkpointRef: args.checkpointRef,
      description: args.changeDescription,
    });

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
            changeId: changeSet.id,
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

// Made with Bob
