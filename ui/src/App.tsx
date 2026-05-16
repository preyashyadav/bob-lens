import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ChangeViewer from './components/ChangeViewer';
import TestRunner from './components/TestRunner';

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
  
  const activeFile = latestChangeSet && latestChangeSet.changes[activeTabIndex]
    ? {
        filePath: latestChangeSet.changes[activeTabIndex].filePath,
        fileType: latestChangeSet.changes[activeTabIndex].fileType
      }
    : undefined;

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Bob Lens</h1>
        <div className="status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main className="main">
        <ChangeViewer
          changeSets={changeSets}
          onApprove={handleApprove}
          onRollback={handleRollback}
          activeTabIndex={activeTabIndex}
          onTabChange={setActiveTabIndex}
        />
        <TestRunner activeFile={activeFile} />
      </main>
    </div>
  );
}

export default App;

// Made with Bob
