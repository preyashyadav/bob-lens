import { useState } from 'react';

function TestRunner() {
  const [testInputs, setTestInputs] = useState('{}');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunTest = async () => {
    setRunning(true);
    setResult(null);

    try {
      const sandboxUrl = import.meta.env.VITE_SANDBOX_URL || 'http://localhost:3334';
      const response = await fetch(`${sandboxUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testInputs: JSON.parse(testInputs),
          framework: 'react',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="test-runner">
      <h2>Run Test</h2>
      
      <div className="test-input-section">
        <label htmlFor="test-inputs">
          <strong>Test Inputs (JSON):</strong>
        </label>
        <textarea
          id="test-inputs"
          value={testInputs}
          onChange={(e) => setTestInputs(e.target.value)}
          rows={10}
          placeholder='{"key": "value"}'
        />
      </div>

      <button
        onClick={handleRunTest}
        disabled={running}
        className="run-button"
      >
        {running ? 'Running...' : 'Run Test'}
      </button>

      {result && (
        <div className="test-result">
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          
          {result.screenshot && (
            <div className="screenshot">
              <h4>Screenshot:</h4>
              <img src={`data:image/png;base64,${result.screenshot}`} alt="Rendered output" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TestRunner;

// Made with Bob
