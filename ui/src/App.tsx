import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ChangeViewer from './components/ChangeViewer';
import TestRunner from './components/TestRunner';

const DEMO_DEFAULT_BACKEND_FILE = 'card.controller.js';

function App() {
  const { connected, changeSets, clearChanges } = useWebSocket();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const handleApprove = (id: string) => {
    console.log('Approved changeSet:', id);
    clearChanges();
  };

  const handleRollback = (id: string) => {
    console.log('Rollback changeSet:', id);
    clearChanges();
  };

  // Get the active file from the latest changeset
  const latestChangeSet = changeSets && changeSets.length > 0 
    ? changeSets[changeSets.length - 1] 
    : null;

  const preferredBackendTabIndex = latestChangeSet
    ? latestChangeSet.changes.findIndex((c) => c.filePath.endsWith(`/${DEMO_DEFAULT_BACKEND_FILE}`))
    : -1;

  const fallbackBackendTabIndex = latestChangeSet
    ? latestChangeSet.changes.findIndex((c) => c.fileType === 'backend')
    : -1;

  const demoBackendTabIndex =
    preferredBackendTabIndex >= 0 ? preferredBackendTabIndex : fallbackBackendTabIndex;

  useEffect(() => {
    if (!latestChangeSet) return;
    if (demoBackendTabIndex < 0) return;
    setActiveTabIndex(demoBackendTabIndex);
  }, [latestChangeSet?.id, demoBackendTabIndex]);
  
  const activeFile = latestChangeSet && latestChangeSet.changes[activeTabIndex]
    ? {
        filePath: latestChangeSet.changes[activeTabIndex].filePath,
        fileType: latestChangeSet.changes[activeTabIndex].fileType
      }
    : undefined;

  return (
    <div className="app">
      <header className="header">
        <h1>Bob Lens</h1>
        <div className="status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      <main className="main" style={{ overflow: 'hidden' }}>
        <div style={{ height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
          <div style={{ height: '100%', overflow: 'auto' }}>
            <ChangeViewer
              changeSets={changeSets}
              onApprove={handleApprove}
              onRollback={handleRollback}
              activeTabIndex={activeTabIndex}
              onTabChange={setActiveTabIndex}
            />
          </div>
          <div style={{ display: 'none' }}>
            <TestRunner activeFile={activeFile} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

// Made with Bob
