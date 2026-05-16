import { broadcastToUI } from '../services/websocket.js';
import { trackChange } from '../services/change-tracker.js';
export async function notifyChangeHandler(args) {
    try {
        // Track the change
        const changeId = await trackChange({
            changedFiles: args.changedFiles,
            checkpointRef: args.checkpointRef,
            description: args.changeDescription,
        });
        // Broadcast to UI via WebSocket
        broadcastToUI({
            type: 'change_notification',
            data: {
                changeId,
                changedFiles: args.changedFiles,
                checkpointRef: args.checkpointRef,
                description: args.changeDescription,
                timestamp: new Date().toISOString(),
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Change notification sent to Bob Lens UI',
                        changeId,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
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
