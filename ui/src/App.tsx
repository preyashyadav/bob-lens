import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import ChangeViewer from './components/ChangeViewer';
import TestRunner from './components/TestRunner';

function App() {
  const { connected, changeData } = useWebSocket();
  const [activeTab, setActiveTab] = useState<'changes' | 'test'>('changes');

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

      <nav className="nav">
        <button
          className={`nav-button ${activeTab === 'changes' ? 'active' : ''}`}
          onClick={() => setActiveTab('changes')}
        >
          Code Changes
        </button>
        <button
          className={`nav-button ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Run Test
        </button>
      </nav>

      <main className="main">
        {activeTab === 'changes' && <ChangeViewer data={changeData} />}
        {activeTab === 'test' && <TestRunner />}
      </main>
    </div>
  );
}

export default App;

// Made with Bob
