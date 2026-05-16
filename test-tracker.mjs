// test-tracker.mjs
import { trackChange } from './mcp-server/dist/services/change-tracker.js';

const result = await trackChange({
  changedFiles: ['/Users/preyashyadav/Documents/personal-projects/demo-project/src/components/Card.jsx'],
  checkpointRef: 'HEAD',
  description: 'Added delete button to Card'
});

console.log('FileType:', result.changes[0].fileType);
console.log('Before length:', result.changes[0].before.length);
console.log('After length:', result.changes[0].after.length);
console.log('Diff preview:', result.changes[0].diff.slice(0, 300));