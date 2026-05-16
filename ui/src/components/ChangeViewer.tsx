import { useState } from 'react';
import { ChangeSet, FileChange } from '../../../types/change';
import AnalysisPanel from './AnalysisPanel';

interface ChangeViewerProps {
  changeSets: ChangeSet[];
  onApprove: (id: string) => void;
  onRollback: (id: string) => void;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

function ChangeViewer({ changeSets, onApprove, onRollback, activeTabIndex, onTabChange }: ChangeViewerProps) {
  const [analysisChangeId, setAnalysisChangeId] = useState<string | null>(null);

  if (!changeSets || changeSets.length === 0) {
    return (
      <div className="change-viewer">
        <div className="empty-state">
          <h2>Waiting for Bob</h2>
          <p>Make a change in Bob IDE to see it visualized here</p>
        </div>
      </div>
    );
  }

  const latestChangeSet = changeSets[changeSets.length - 1];
  const activeFile = latestChangeSet.changes[activeTabIndex];

  // Helper function to get filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  // Helper function to calculate change indicator color
  const getChangeIndicator = (file: FileChange): string => {
    const beforeLen = file.before.length;
    const afterLen = file.after.length;
    
    if (beforeLen === 0) {
      return 'red'; // New file
    }
    
    const diff = Math.abs(afterLen - beforeLen);
    const percentChange = (diff / beforeLen) * 100;
    
    if (percentChange < 10) {
      return 'green'; // Small change
    } else if (percentChange < 50) {
      return 'yellow'; // Moderate change
    } else {
      return 'red'; // Large change
    }
  };

  // Helper function to get file type badge
  const getFileTypeBadge = (fileType: string): string => {
    switch (fileType) {
      case 'frontend':
        return '[F]';
      case 'backend':
        return '[B]';
      case 'config':
        return '[C]';
      default:
        return '[?]';
    }
  };

  const renderUnifiedDiff = (diff: string | undefined) => {
    if (!diff) {
      return <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No diff available</div>;
    }

    const lines = diff.split('\n');
    return (
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: 1.5,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {lines.map((line, i) => {
          const isAdd = line.startsWith('+') && !line.startsWith('+++');
          const isDel = line.startsWith('-') && !line.startsWith('---');
          const isHunk = line.startsWith('@@');

          let background = 'var(--bg-primary)';
          let color = 'var(--text-primary)';
          let lineNumberBg = 'transparent';
          let fontStyle: 'normal' | 'italic' = 'normal';

          if (isAdd) {
            background = 'rgba(46,160,67,0.15)';
            color = '#3fb950';
            lineNumberBg = 'rgba(46,160,67,0.3)';
          } else if (isDel) {
            background = 'rgba(248,81,73,0.15)';
            color = '#f85149';
            lineNumberBg = 'rgba(248,81,73,0.3)';
          } else if (isHunk) {
            background = 'rgba(56,139,253,0.1)';
            color = '#79c0ff';
            fontStyle = 'italic';
          }

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                whiteSpace: 'pre',
                background,
                color,
                fontStyle,
              }}
            >
              <div
                style={{
                  width: 40,
                  flexShrink: 0,
                  textAlign: 'right',
                  padding: '0 8px 0 0',
                  userSelect: 'none',
                  background: lineNumberBg,
                  color: 'var(--text-secondary)',
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, padding: '0 8px' }}>{line || ' '}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="change-viewer">
      {/* Top Section - Task Header */}
      <div className="task-header">
        <div className="task-info">
          <h2>{latestChangeSet.description || 'Code Changes'}</h2>
          <span className="timestamp">
            {new Date(latestChangeSet.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="task-actions">
          <button
            className="btn-approve"
            onClick={() => onApprove(latestChangeSet.id)}
          >
            ✓ Approve
          </button>
          <button
            className="btn-rollback"
            onClick={() => onRollback(latestChangeSet.id)}
          >
            ↩ Rollback
          </button>
        </div>
      </div>

      {/* Middle Section - File Tabs */}
      <div className="file-tabs">
        {latestChangeSet.changes.map((file, index) => (
          <button
            key={index}
            className={`file-tab ${index === activeTabIndex ? 'active' : ''}`}
            onClick={() => onTabChange(index)}
          >
            <span
              className="change-indicator"
              style={{ backgroundColor: getChangeIndicator(file) }}
            />
            {getFileName(file.filePath)}
            <span className="file-type-badge">{getFileTypeBadge(file.fileType)}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setAnalysisChangeId(latestChangeSet.id);
              }}
              title="View analysis"
              aria-label="View analysis"
              style={{
                marginLeft: 8,
                background: 'transparent',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                borderRadius: 4,
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: 12,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              👁
            </span>
          </button>
        ))}
      </div>

      {/* Bottom Section - Active Tab Content */}
      {activeFile && (
        <div className="tab-content">
          <div className="split-panel">
            <div className="panel-before">
              <div className="panel-label">BEFORE</div>
              <pre className="code-content">{activeFile.before || '(empty)'}</pre>
            </div>
            <div className="panel-after">
              <div className="panel-label">AFTER</div>
              <pre className="code-content">{activeFile.after || '(empty)'}</pre>
            </div>
          </div>
          <div className="diff-panel">
            <div className="panel-label">DIFF</div>
            <div className="diff-content">{renderUnifiedDiff(activeFile.diff)}</div>
          </div>
        </div>
      )}

      {analysisChangeId && (
        <AnalysisPanel changeId={analysisChangeId} onClose={() => setAnalysisChangeId(null)} />
      )}
    </div>
  );
}

export default ChangeViewer;

// Made with Bob
