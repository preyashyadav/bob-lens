import { useState } from 'react';

interface FlowNode {
  id: string;
  label: string;
  file: string;
  line: number | null;
  type: 'component' | 'function' | 'route' | 'database' | 'return';
  status: 'unchanged' | 'new' | 'modified' | 'removed';
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  edges: Array<{ from: string; to: string }>;
  title: 'BEFORE' | 'AFTER';
}

const STATUS_COLORS: Record<
  FlowNode['status'],
  { border: string; bg: string; text: string }
> = {
  unchanged: { border: '#3e3e42', bg: '#2d2d30', text: '#cccccc' },
  new: { border: '#4caf50', bg: 'rgba(76,175,80,0.15)', text: '#4caf50' },
  modified: { border: '#ff9800', bg: 'rgba(255,152,0,0.15)', text: '#ff9800' },
  removed: { border: '#f44747', bg: 'rgba(244,71,71,0.15)', text: '#f44747' },
};

const TYPE_ICON: Record<FlowNode['type'], string> = {
  component: '🧩',
  function: 'ƒ',
  route: '⇢',
  database: '🗄',
  return: '↩',
};

function fileLineLabel(file: string, line: number | null) {
  const fileName = file.split('/').pop() || file;
  if (line === null) return fileName;
  return `${fileName}:${line}`;
}

function hasIncoming(nodeId: string, edges: Array<{ from: string; to: string }>) {
  return edges.some((e) => e.to === nodeId);
}

function hasOutgoing(nodeId: string, edges: Array<{ from: string; to: string }>) {
  return edges.some((e) => e.from === nodeId);
}

export default function FlowDiagram({ nodes, edges }: FlowDiagramProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scale = Math.min(Math.max(transform.scale - e.deltaY * 0.001, 0.3), 2);
    setTransform((t) => ({ ...t, scale }));
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          style={{
            background: 'transparent',
            border: '1px solid #3e3e42',
            color: '#cccccc',
            borderRadius: 4,
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 12,
            lineHeight: 1,
          }}
          title="Reset view"
        >
          ⌖ Reset view
        </button>
      </div>
      {nodes.length === 0 ? (
        <div style={{ color: '#8c8c8c', fontSize: 12, padding: 12 }}>No nodes</div>
      ) : (
        <div
          style={{
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            height: '100%',
            flex: 1,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s',
              padding: 12,
            }}
          >
            {nodes.map((node, index) => {
              const colors = STATUS_COLORS[node.status] ?? STATUS_COLORS.unchanged;
              const showConnector = index < nodes.length - 1;

              return (
                <div key={node.id}>
                  <div
                    style={{
                      borderLeft: `4px solid ${colors.border}`,
                      background: colors.bg,
                      borderRadius: 4,
                      padding: '10px 14px',
                      color: colors.text,
                      border: '1px solid #3e3e42',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                    title={
                      edges.length
                        ? [
                            hasIncoming(node.id, edges) ? 'has incoming' : 'no incoming',
                            hasOutgoing(node.id, edges) ? 'has outgoing' : 'no outgoing',
                          ].join(', ')
                        : undefined
                    }
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{TYPE_ICON[node.type] ?? '•'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{node.label}</span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#8c8c8c' }}>
                      {fileLineLabel(node.file, node.line)}
                    </div>
                  </div>

                  {showConnector && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 2, height: 24, background: '#3e3e42' }} />
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #3e3e42',
                          margin: '0 auto',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
