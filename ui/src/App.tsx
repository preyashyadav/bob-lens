import { useWebSocket } from './hooks/useWebSocket';
import ChangeViewer from './components/ChangeViewer';
import TestRunner from './components/TestRunner';

function App() {
  const { connected, changeSets, clearChanges } = useWebSocket();

  const handleApprove = (id: string) => {
    console.log('Approved changeSet:', id);
    clearChanges();
  };

  const handleRollback = (id: string) => {
    console.log('Rollback changeSet:', id);
    clearChanges();
  };

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
        />
        <TestRunner />
      </main>
    </div>
  );
}

export default App;

// Made with Bob
