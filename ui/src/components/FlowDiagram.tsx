import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Braces, Database, GitBranch, Puzzle, RotateCcw } from 'lucide-react';

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

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: Array<{ from: string; to: string }>;
  title: 'BEFORE' | 'AFTER';
}

const statusColor = (status: FlowNode['status']): string => {
  switch (status) {
    case 'new':
      return '#42be65';
    case 'modified':
      return '#f1c21b';
    case 'removed':
      return '#fa4d56';
    default:
      return '#353b41';
  }
};

const typeColor = (type: FlowNode['type']): string => {
  switch (type) {
    case 'component':
      return '#7aabff';
    case 'function':
      return '#42be65';
    case 'route':
      return '#f1c21b';
    case 'database':
      return '#fa4d56';
    case 'return':
      return '#353b41';
    default:
      return '#353b41';
  }
};

const TypeIcon = ({ type }: { type: FlowNode['type'] }) => {
  const common = { size: 14, color: '#697077' } as const;
  switch (type) {
    case 'component':
      return <Puzzle {...common} />;
    case 'function':
      return <Braces {...common} />;
    case 'route':
      return <GitBranch {...common} />;
    case 'database':
      return <Database {...common} />;
    case 'return':
      return <RotateCcw {...common} />;
    default:
      return <Braces {...common} />;
  }
};

function fileLineLabel(file: string, line: number | null) {
  const fileName = file.split('/').pop() || file;
  if (line === null) return fileName;
  return `${fileName}:${line}`;
}

export default function FlowDiagram({ nodes, edges }: FlowDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [centersById, setCentersById] = useState<Record<string, number>>({});

  // eslint-disable-next-line no-console
  console.log('[FlowDiagram render]', { expandedNodeId });

  const connectors = useMemo(() => {
    return edges
      .map((e) => ({ from: e.from, to: e.to }))
      .filter((e) => e.from in centersById && e.to in centersById);
  }, [edges, centersById]);

  const recomputeCenters = () => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const next: Record<string, number> = {};
    for (const node of nodes) {
      const el = nodeRefs.current[node.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[node.id] = r.top - containerRect.top + r.height / 2;
    }
    setCentersById(next);
  };

  useLayoutEffect(() => {
    recomputeCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, expandedNodeId]);

  useEffect(() => {
    const handle = () => recomputeCenters();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  return (
    <div style={{ height: '100%', position: 'relative', background: '#171717' }}>
      <div
        style={{
          padding: 8,
          display: 'flex',
          justifyContent: 'flex-end',
          borderBottom: '1px solid #353b41',
          background: '#171717',
        }}
      >
        <button
          type="button"
          onClick={() => setExpandedNodeId(null)}
          style={{
            background: 'transparent',
            border: '1px solid #353b41',
            color: '#7aabff',
            borderRadius: 4,
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 11,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-ui)',
          }}
          title="Collapse all"
        >
          <RotateCcw size={12} />
          Collapse
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          height: '100%',
          overflow: 'auto',
          padding: 16,
        }}
      >
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {connectors.map(({ from, to }) => {
            const fromY = centersById[from];
            const toY = centersById[to];
            if (fromY === undefined || toY === undefined) return null;

            const midY = (fromY + toY) / 2;
            const x = 90;
            const path = `M ${x} ${fromY} C ${x} ${midY}, ${x} ${midY}, ${x} ${toY}`;

            return (
              <g key={`${from}:${to}`}>
                <path d={path} fill="none" stroke="#353b41" strokeWidth={2} strokeDasharray="4 3" />
                <polygon points={`${x - 4},${toY} ${x + 4},${toY} ${x},${toY + 6}`} fill="#353b41" />
              </g>
            );
          })}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
          {nodes.map((node, idx) => {
            const border = statusColor(node.status);
            const strip = typeColor(node.type);
            const nextNode = idx < nodes.length - 1 ? nodes[idx + 1] : null;
            const connectedToNext =
              nextNode !== null && edges.some((e) => e.from === node.id && e.to === nextNode.id) && !!node.output && !!nextNode.input;

            return (
              <Fragment key={node.id}>
                <div
                  ref={(el) => {
                    nodeRefs.current[node.id] = el;
                  }}
                  style={{
                    background: '#202432',
                    border: `1px solid ${border}`,
                    borderRadius: 4,
                    padding: '10px 14px',
                    minWidth: 180,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  // Each node's root div must have this directly:
                  onClick={() => setExpandedNodeId((prev) => (prev === node.id ? null : node.id))}
                >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    borderRadius: '4px 0 0 4px',
                    background: strip,
                  }}
                />

                <div style={{ paddingLeft: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <TypeIcon type={node.type} />
                    <div
                      style={{
                        fontSize: '9px',
                        fontFamily: 'var(--font-ui)',
                        color: '#697077',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                      }}
                    >
                      {node.type}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 500,
                      color: '#ffffff',
                      marginBottom: 2,
                    }}
                  >
                    {node.label}
                  </div>

                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#697077' }}>
                    {fileLineLabel(node.file, node.line)}
                  </div>

                  {node.status !== 'unchanged' && (
                    <div
                      style={{
                        marginTop: 6,
                        display: 'inline-block',
                        fontSize: '9px',
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          node.status === 'new'
                            ? 'rgba(66,190,101,0.15)'
                            : node.status === 'modified'
                              ? 'rgba(241,194,27,0.15)'
                              : 'rgba(250,77,86,0.15)',
                        color:
                          node.status === 'new'
                            ? '#42be65'
                            : node.status === 'modified'
                              ? '#f1c21b'
                              : '#fa4d56',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {node.status}
                    </div>
                  )}

                  {(node.input || node.output || node.description) && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '9px',
                        fontFamily: 'var(--font-ui)',
                        color: '#7aabff',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {expandedNodeId === node.id ? 'collapse' : 'click to expand'}
                    </div>
                  )}

                  {expandedNodeId === node.id && (node.input || node.output || node.description) && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 10,
                        borderTop: '1px solid #353b41',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      {node.input && (
                        <div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-ui)',
                              color: '#697077',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                              marginBottom: 3,
                            }}
                          >
                            Input
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: '#42be65',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {node.input}
                          </div>
                        </div>
                      )}

                      {node.description && (
                        <div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-ui)',
                              color: '#697077',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                              marginBottom: 3,
                            }}
                          >
                            What it does
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-ui)',
                              color: '#ecf1f8',
                              lineHeight: '1.5',
                              fontStyle: 'italic',
                            }}
                          >
                            {node.description}
                          </div>
                        </div>
                      )}

                      {node.output && (
                        <div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-ui)',
                              color: '#697077',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                              marginBottom: 3,
                            }}
                          >
                            Output
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: '#f1c21b',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {node.output}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>

                {connectedToNext && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 0',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        background: '#353b41',
                      }}
                    />
                    <div
                      style={{
                        position: 'relative',
                        background: '#202432',
                        border: '1px solid #353b41',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        fontSize: '9px',
                        fontFamily: 'var(--font-mono)',
                        color: '#697077',
                        maxWidth: '140px',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        zIndex: 1,
                      }}
                      title={node.output}
                    >
                      {node.output}
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
