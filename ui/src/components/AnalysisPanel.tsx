import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Coins, Download, Loader2, X, Zap } from 'lucide-react';
import FlowDiagram from './FlowDiagram';

interface FlowNode {
  id: string;
  label: string;
  file: string;
  line: number | null;
  type: 'component' | 'function' | 'route' | 'database' | 'return';
  status: 'unchanged' | 'new' | 'modified' | 'removed';
  input?: string;
  output?: string;
  description?: string;
}

interface FlowGraph {
  before: FlowNode[];
  after: FlowNode[];
  edges_before: Array<{ from: string; to: string }>;
  edges_after: Array<{ from: string; to: string }>;
}

type Verdict = 'safe' | 'review' | 'risky';

interface AnalysisPayload {
  success: boolean;
  workspacePath?: string;
  analysis?: Partial<FlowGraph> & {
    summary?: string;
    explanation?: string;
    risks?: string[];
    verdict?: Verdict;
    tokens?: number;
    cost?: number;
    durationMs?: number;
  };
}

interface AnalysisPanelProps {
  changeId: string;
  onClose: () => void;
}

function verdictColors(verdict: Verdict | undefined) {
  switch (verdict) {
    case 'safe':
      return { bg: 'rgba(66,190,101,0.1)', text: '#42be65', border: '#42be65', label: 'SAFE' };
    case 'review':
      return { bg: 'rgba(241,194,27,0.1)', text: '#f1c21b', border: '#f1c21b', label: 'REVIEW' };
    case 'risky':
      return { bg: 'rgba(250,77,86,0.1)', text: '#fa4d56', border: '#fa4d56', label: 'RISKY' };
    default:
      return { bg: 'rgba(241,194,27,0.1)', text: '#f1c21b', border: '#f1c21b', label: 'REVIEW' };
  }
}

export default function AnalysisPanel({ changeId, onClose }: AnalysisPanelProps) {
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NonNullable<AnalysisPayload['analysis']> | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setNotReady(false);
    setErrorMessage(null);
    setAnalysis(null);

    try {
      const res = await fetch(`http://localhost:8083/analysis/${changeId}`);
      const data = (await res.json()) as AnalysisPayload;
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setWorkspacePath(data.workspacePath || null);
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    setNotReady(true);
    setLoading(false);
  }, [changeId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const verdict: Verdict = (analysis?.verdict as Verdict) || 'review';
  const verdictStyle = useMemo(() => verdictColors(verdict), [verdict]);

  const beforeNodes = analysis?.before || [];
  const afterNodes = analysis?.after || [];
  const edgesBefore = analysis?.edges_before || [];
  const edgesAfter = analysis?.edges_after || [];
  const summary = analysis?.summary || 'Bob analyzed this change';
  const explanation = analysis?.explanation || '';
  const risks = analysis?.risks || [];
  const tokens = analysis?.tokens;
  const durationMs = analysis?.durationMs;

  const handleExport = async () => {
    if (!workspacePath) return;

    setExporting(true);
    try {
      const res = await fetch('http://localhost:8083/export-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeId,
          workspacePath,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExported(true);
        window.setTimeout(() => setExported(false), 3000);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Export failed', e);
    }
    setExporting(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1200px, 100%)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          overflow: 'hidden',
          background: '#171717',
          border: '1px solid #353b41',
          borderRadius: 4,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: '#202432',
            borderBottom: '1px solid #353b41',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-ui)', color: '#ecf1f8' }}>
            {summary}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              padding: '4px 8px',
              borderRadius: 4,
              background: verdictStyle.bg,
              border: `1px solid ${verdictStyle.border}`,
              color: verdictStyle.text,
            }}
          >
            {verdictStyle.label}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #353b41',
              color: '#697077',
              borderRadius: 4,
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
            }}
            aria-label="Close"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#ecf1f8', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <Loader2 size={14} className="animate-spin" />
              <span>Bob is analyzing...</span>
            </div>
          ) : errorMessage ? (
            <div style={{ color: '#ecf1f8', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <div style={{ marginBottom: 10 }}>{errorMessage}</div>
              <button
                onClick={fetchAnalysis}
                style={{
                  background: 'transparent',
                  border: '1px solid #7aabff',
                  color: '#7aabff',
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Retry
              </button>
            </div>
          ) : notReady ? (
            <div style={{ color: '#ecf1f8', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <div style={{ marginBottom: 10 }}>
                Analysis in progress... Bob is still thinking. Try again in a moment.
              </div>
              <button
                onClick={fetchAnalysis}
                style={{
                  background: 'transparent',
                  border: '1px solid #7aabff',
                  color: '#7aabff',
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: '#697077', fontWeight: 600, fontSize: 10, fontFamily: 'var(--font-ui)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Before</div>
                  <div
                    style={{
                      height: 400,
                      background: '#171717',
                      border: '1px solid #353b41',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <FlowDiagram nodes={beforeNodes} edges={edgesBefore} title="BEFORE" />
                  </div>
                </div>
                <div>
                  <div style={{ color: '#697077', fontWeight: 600, fontSize: 10, fontFamily: 'var(--font-ui)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>After</div>
                  <div
                    style={{
                      height: 400,
                      background: '#171717',
                      border: '1px solid #353b41',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <FlowDiagram nodes={afterNodes} edges={edgesAfter} title="AFTER" />
                  </div>
                </div>
              </div>

              <div style={{ color: '#ecf1f8', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '12px 0', lineHeight: 1.6 }}>
                {explanation}
              </div>

              {risks.length > 0 && (
                <div style={{ padding: '0 0 16px' }}>
                  <div style={{ color: '#697077', fontWeight: 600, fontSize: 10, fontFamily: 'var(--font-ui)', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Risks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {risks.map((risk, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'flex-start',
                          padding: '8px 10px',
                          borderRadius: 4,
                          borderLeft: '3px solid #f1c21b',
                          borderTop: '1px solid #353b41',
                          borderRight: '1px solid #353b41',
                          borderBottom: '1px solid #353b41',
                          background: 'rgba(241,194,27,0.08)',
                          color: '#ecf1f8',
                          fontSize: 12,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            marginTop: 5,
                            background: '#f1c21b',
                            display: 'inline-block',
                          }}
                        />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Stats bar - always visible at bottom */}
        <div
          style={{
            flexShrink: 0,
            padding: '10px 16px',
            borderTop: '1px solid #353b41',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#171717',
          }}
        >
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-ui)', color: '#697077' }}>Powered by IBM BobShell</span>
          {tokens !== undefined && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: '#7aabff',
                background: 'rgba(122,171,255,0.1)',
                padding: '2px 8px',
                borderRadius: '2px',
                border: '1px solid rgba(122,171,255,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Coins size={11} />
              {tokens.toLocaleString()} tokens
            </span>
          )}
          {durationMs !== undefined && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: '#697077',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 8px',
                borderRadius: '2px',
                border: '1px solid #353b41',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={11} />
              {(durationMs / 1000).toFixed(1)}s
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || exported || !workspacePath}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-ui)',
              background: exported ? 'rgba(66,190,101,0.1)' : 'transparent',
              border: `1px solid ${exported ? '#42be65' : '#7aabff'}`,
              borderRadius: '2px',
              color: exported ? '#42be65' : '#7aabff',
              cursor: exporting ? 'wait' : workspacePath ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 400,
              opacity: workspacePath ? 1 : 0.6,
            }}
            title={workspacePath ? 'Export this session report to bob_sessions/' : 'Workspace path unavailable'}
            aria-label="Export session"
          >
            {exported ? <Check size={11} /> : exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            {exported ? 'Exported' : exporting ? 'Exporting...' : 'Export Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
