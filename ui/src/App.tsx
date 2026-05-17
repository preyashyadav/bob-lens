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
      <header
        style={{
          background: '#171717',
          borderBottom: '1px solid #353b41',
          padding: '0 24px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/bob-lens-logo.png"
            alt="Bob Lens"
            style={{ width: 18, height: 18, display: 'block' }}
          />
          <span
            style={{
              fontFamily: 'IBM Plex Sans',
              fontWeight: 600,
              fontSize: '14px',
              color: '#ffffff',
              letterSpacing: '0.5px',
            }}
          >
            Bob Lens
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#697077',
              fontFamily: 'IBM Plex Sans',
              fontWeight: 300,
            }}
          >
            Visual Change Intelligence
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connected ? '#42be65' : '#fa4d56',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              color: '#697077',
              fontFamily: 'IBM Plex Sans',
            }}
          >
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
