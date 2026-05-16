import { ChangeSet, FileChange } from '../../../types/change';

interface ChangeViewerProps {
  changeSets: ChangeSet[];
  onApprove: (id: string) => void;
  onRollback: (id: string) => void;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

function ChangeViewer({ changeSets, onApprove, onRollback, activeTabIndex, onTabChange }: ChangeViewerProps) {

  if (!changeSets || changeSets.length === 0) {
    return (
      <div className="change-viewer">
        <div className="empty-state">
          <h2>No changes yet</h2>
          <p>Waiting for Bob to make code changes...</p>
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

  // Helper function to style diff lines
  const renderDiff = (diff: string) => {
    const lines = diff.split('\n');
    return lines.map((line, index) => {
      let className = '';
      if (line.startsWith('+')) {
        className = 'diff-add';
      } else if (line.startsWith('-')) {
        className = 'diff-remove';
      }
      return (
        <div key={index} className={className}>
          {line}
        </div>
      );
    });
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
            <span className="file-name">{getFileName(file.filePath)}</span>
            <span className="file-type-badge">{getFileTypeBadge(file.fileType)}</span>
          </button>
        ))}
      </div>

      {/* Bottom Section - Active Tab Content */}
      {activeFile && (
        <div className="tab-content">
          <div className="split-panel">
            <div className="panel-before">
              <div className="panel-label">BEFORE</div>
              <pre className="code-content">{activeFile.before}</pre>
            </div>
            <div className="panel-after">
              <div className="panel-label">AFTER</div>
              <pre className="code-content">{activeFile.after}</pre>
            </div>
          </div>
          <div className="diff-panel">
            <div className="panel-label">DIFF</div>
            <pre className="diff-content">{renderDiff(activeFile.diff)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChangeViewer;

// Made with Bob
