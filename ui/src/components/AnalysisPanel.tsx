import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import FlowDiagram from './FlowDiagram';

interface FlowNode {
  id: string;
  label: string;
  file: string;
  line: number | null;
  type: 'component' | 'function' | 'route' | 'database' | 'return';
  status: 'unchanged' | 'new' | 'modified' | 'removed';
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
  analysis?: Partial<FlowGraph> & {
    summary?: string;
    explanation?: string;
    risks?: string[];
    verdict?: Verdict;
  };
}

interface AnalysisPanelProps {
  changeId: string;
  onClose: () => void;
}

function verdictColors(verdict: Verdict | undefined) {
  switch (verdict) {
    case 'safe':
      return { bg: 'rgba(76,175,80,0.2)', text: '#4caf50', label: 'SAFE' };
    case 'review':
      return { bg: 'rgba(255,152,0,0.2)', text: '#ff9800', label: 'REVIEW' };
    case 'risky':
      return { bg: 'rgba(244,71,71,0.2)', text: '#f44747', label: 'RISKY' };
    default:
      return { bg: '#3e3e42', text: '#8c8c8c', label: 'REVIEW' };
  }
}

export default function AnalysisPanel({ changeId, onClose }: AnalysisPanelProps) {
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NonNullable<AnalysisPayload['analysis']> | null>(null);

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
          maxHeight: '90vh',
          background: '#252526',
          border: '1px solid #3e3e42',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderBottom: '1px solid #3e3e42',
          }}
        >
          <div style={{ flex: 1, fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-ui)', color: '#cccccc' }}>
            {summary}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-ui)',
              padding: '4px 8px',
              borderRadius: 999,
              background: verdictStyle.bg,
              color: verdictStyle.text,
            }}
          >
            {verdictStyle.label}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #3e3e42',
              color: '#cccccc',
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

        {/* Main area */}
        <div style={{ padding: 16, overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#cccccc', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <Loader2 size={14} className="animate-spin" />
              <span>Bob is analyzing...</span>
            </div>
          ) : errorMessage ? (
            <div style={{ color: '#cccccc', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <div style={{ marginBottom: 10 }}>{errorMessage}</div>
              <button
                onClick={fetchAnalysis}
                style={{
                  background: '#0e639c',
                  border: '1px solid #007acc',
                  color: '#ffffff',
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
            <div style={{ color: '#cccccc', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
              <div style={{ marginBottom: 10 }}>
                Analysis in progress... Bob is still thinking. Try again in a moment.
              </div>
              <button
                onClick={fetchAnalysis}
                style={{
                  background: '#0e639c',
                  border: '1px solid #007acc',
                  color: '#ffffff',
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
                  <div style={{ color: '#cccccc', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)', marginBottom: 8 }}>BEFORE</div>
                  <div
                    style={{
                      height: 400,
                      background: '#1e1e1e',
                      border: '1px solid #3e3e42',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <FlowDiagram nodes={beforeNodes} edges={edgesBefore} title="BEFORE" />
                  </div>
                </div>
                <div>
                  <div style={{ color: '#cccccc', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)', marginBottom: 8 }}>AFTER</div>
                  <div
                    style={{
                      height: 400,
                      background: '#1e1e1e',
                      border: '1px solid #3e3e42',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <FlowDiagram nodes={afterNodes} edges={edgesAfter} title="AFTER" />
                  </div>
                </div>
              </div>

              <div style={{ color: '#cccccc', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '12px 16px' }}>
                {explanation}
              </div>

              {risks.length > 0 && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ color: '#cccccc', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-ui)', marginBottom: 8 }}>Risks</div>
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
                          border: '1px solid rgba(255,152,0,0.35)',
                          background: 'rgba(255,152,0,0.12)',
                          color: '#cccccc',
                          fontSize: 12,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <span style={{ color: '#ff9800', display: 'inline-flex', marginTop: 1 }}>
                          <AlertTriangle size={14} />
                        </span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
