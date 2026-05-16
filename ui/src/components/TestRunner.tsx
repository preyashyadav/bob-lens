import { useState } from 'react';

interface TestRunnerProps {
  activeFile?: {
    filePath: string;
    fileType: 'frontend' | 'backend' | 'config';
  };
}

interface StepData {
  layer: string;
  status: 'pending' | 'active' | 'success' | 'error' | 'skipped';
  duration?: number;
  output?: any;
  note?: string;
}

function TestRunner({ activeFile }: TestRunnerProps) {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/cards');
  const [headersJson, setHeadersJson] = useState('{}');
  const [bodyJson, setBodyJson] = useState('{}');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [finalResponse, setFinalResponse] = useState<any>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const handleRunTest = async () => {
    setSteps([]);
    setFinalResponse(null);
    setRunning(true);
    setExpandedSteps(new Set());

    try {
      const sandboxUrl = import.meta.env.VITE_SANDBOX_URL || 'http://localhost:3334';
      
      const response = await fetch(`${sandboxUrl}/execute/backend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          endpoint,
          headers: JSON.parse(headersJson),
          body: JSON.parse(bodyJson),
          targetFile: activeFile?.filePath || '',
          checkpointRef: 'HEAD'
        })
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                setRunning(false);
                if (data.response) {
                  setFinalResponse(data.response);
                }
              } else {
                setSteps(prev => {
                  const existing = prev.find(s => s.layer === data.layer);
                  if (existing) {
                    return prev.map(s => s.layer === data.layer ? data : s);
                  }
                  return [...prev, data];
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Test execution error:', error);
      setSteps(prev => [...prev, {
        layer: 'error',
        status: 'error',
        note: error.message
      }]);
      setRunning(false);
    }
  };

  const toggleStepExpanded = (layer: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-icon pending">○</span>;
      case 'active':
        return <span className="status-icon active spinning">◉</span>;
      case 'success':
        return <span className="status-icon success">✓</span>;
      case 'error':
        return <span className="status-icon error">✗</span>;
      case 'skipped':
        return <span className="status-icon skipped">−</span>;
      default:
        return <span className="status-icon pending">○</span>;
    }
  };

  const errorStep = steps.find(s => s.status === 'error');

  return (
    <div className="test-runner">
      <h2>Backend Test Runner</h2>
      
      {/* Section 1: Test Input Form */}
      <div className="test-input-section">
        <div className="form-row" style={{ gridColumn: '1 / 2' }}>
          <label htmlFor="method">Method</label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            disabled={running}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="form-row" style={{ gridColumn: '2 / 3' }}>
          <label htmlFor="endpoint">Endpoint</label>
          <input
            id="endpoint"
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            disabled={running}
            placeholder="/api/cards"
          />
        </div>

        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="headers">Headers (JSON)</label>
          <textarea
            id="headers"
            value={headersJson}
            onChange={(e) => setHeadersJson(e.target.value)}
            disabled={running}
            rows={3}
            placeholder="{}"
          />
        </div>

        <div className="form-row" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="body">Body (JSON)</label>
          <textarea
            id="body"
            value={bodyJson}
            onChange={(e) => setBodyJson(e.target.value)}
            disabled={running}
            rows={5}
            placeholder="{}"
          />
        </div>

        {activeFile && (
          <div className="active-file-info" style={{ gridColumn: '1 / -1' }}>
            <strong>Target File:</strong> {activeFile.filePath}
          </div>
        )}

        <button
          onClick={handleRunTest}
          disabled={running}
          className="run-button"
          style={{ gridColumn: '1 / -1' }}
        >
          {running ? 'Running...' : 'Run Test'}
        </button>
      </div>

      {/* Section 2: Flow Visualization */}
      {steps.length > 0 && (
        <div className="flow-visualization">
          <h3>Execution Flow</h3>
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={step.layer} className="step-wrapper">
                <div className={`step-card ${step.status}`}>
                  <div className="step-header">
                    {getStatusIcon(step.status)}
                    <span className="step-title">{step.layer.charAt(0).toUpperCase() + step.layer.slice(1)}</span>
                    {step.duration !== undefined && (
                      <span className="step-duration">{step.duration}ms</span>
                    )}
                  </div>
                  
                  {step.output && (
                    <div className="step-output">
                      <button
                        className="output-toggle"
                        onClick={() => toggleStepExpanded(step.layer)}
                      >
                        {expandedSteps.has(step.layer) ? '▼' : '▶'} Output
                      </button>
                      {expandedSteps.has(step.layer) && (
                        <pre className="output-content">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {step.note && (
                    <div className="step-note">{step.note}</div>
                  )}
                </div>
                
                {index < steps.length - 1 && (
                  <div className="step-connector" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Final Response */}
      {finalResponse && (
        <div className="final-response">
          <h3>Response</h3>
          <div className={`response-status status-${Math.floor(finalResponse.statusCode / 100)}xx`}>
            Status: {finalResponse.statusCode}
          </div>
          <div className="response-body">
            <pre>{JSON.stringify(finalResponse.body, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Section 4: Error State */}
      {errorStep && (
        <div className="error-banner">
          <strong>Error in {errorStep.layer}:</strong> {errorStep.note}
        </div>
      )}
    </div>
  );
}

export default TestRunner;

// Made with Bob
