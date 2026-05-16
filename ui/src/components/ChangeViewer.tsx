
interface ChangeViewerProps {
  data: any;
}

function ChangeViewer({ data }: ChangeViewerProps) {
  if (!data) {
    return (
      <div className="change-viewer">
        <div className="empty-state">
          <h2>No changes yet</h2>
          <p>Waiting for Bob to make code changes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="change-viewer">
      <div className="change-header">
        <h2>Code Changes</h2>
        <span className="change-id">ID: {data.changeId}</span>
      </div>

      <div className="change-info">
        <p><strong>Checkpoint:</strong> {data.checkpointRef}</p>
        <p><strong>Time:</strong> {new Date(data.timestamp).toLocaleString()}</p>
        {data.description && <p><strong>Description:</strong> {data.description}</p>}
      </div>

      <div className="changed-files">
        <h3>Changed Files ({data.changedFiles?.length || 0})</h3>
        <ul>
          {data.changedFiles?.map((file: string, index: number) => (
            <li key={index}>
              <code>{file}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="placeholder">
        <p>📊 Diff view, flow diagrams, and screenshots will be displayed here</p>
      </div>
    </div>
  );
}

export default ChangeViewer;

// Made with Bob
