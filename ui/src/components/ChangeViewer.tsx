import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Code2, CornerUpLeft, Eye, LayoutGrid, Loader2 } from 'lucide-react';
import { ChangeSet, FileChange } from '../../../types/change';
import AnalysisPanel from './AnalysisPanel';

interface ChangeViewerProps {
  changeSets: ChangeSet[];
  onApprove: (id: string) => void;
  onRollback: (id: string) => void;
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

interface ScreenshotState {
  loading: boolean;
  before: string;
  after: string;
  error?: string;
}

// Helper function to find character-level differences between two strings
function getCharDiffs(oldStr: string, newStr: string): { oldHighlights: boolean[], newHighlights: boolean[] } {
  const oldHighlights: boolean[] = new Array(oldStr.length).fill(false);
  const newHighlights: boolean[] = new Array(newStr.length).fill(false);
  
  let i = 0, j = 0;
  
  // Find matching prefix
  while (i < oldStr.length && j < newStr.length && oldStr[i] === newStr[j]) {
    i++;
    j++;
  }
  
  // Find matching suffix
  let oldEnd = oldStr.length - 1;
  let newEnd = newStr.length - 1;
  while (oldEnd >= i && newEnd >= j && oldStr[oldEnd] === newStr[newEnd]) {
    oldEnd--;
    newEnd--;
  }
  
  // Mark differences
  for (let k = i; k <= oldEnd; k++) {
    oldHighlights[k] = true;
  }
  for (let k = j; k <= newEnd; k++) {
    newHighlights[k] = true;
  }
  
  return { oldHighlights, newHighlights };
}

// Helper function to render text with character-level highlights
function renderWithHighlights(text: string, highlights: boolean[], bgColor: string) {
  const result: JSX.Element[] = [];
  let currentSegment = '';
  let isHighlighted = false;
  
  for (let i = 0; i < text.length; i++) {
    if (highlights[i] !== isHighlighted) {
      if (currentSegment) {
        result.push(
          isHighlighted ? (
            <span key={i} style={{ background: bgColor }}>{currentSegment}</span>
          ) : (
            <span key={i}>{currentSegment}</span>
          )
        );
      }
      currentSegment = text[i];
      isHighlighted = highlights[i];
    } else {
      currentSegment += text[i];
    }
  }
  
  if (currentSegment) {
    result.push(
      isHighlighted ? (
        <span key={text.length} style={{ background: bgColor }}>{currentSegment}</span>
      ) : (
        <span key={text.length}>{currentSegment}</span>
      )
    );
  }
  
  return result;
}

function ChangeViewer({ changeSets, onApprove, onRollback, activeTabIndex, onTabChange }: ChangeViewerProps) {
  const [analysisChangeId, setAnalysisChangeId] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotState | null>(null);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [analysisReadyByChangeSetId, setAnalysisReadyByChangeSetId] = useState<Record<string, boolean>>({});
  const [analysisPollingByChangeSetId, setAnalysisPollingByChangeSetId] = useState<Record<string, boolean>>({});

  const latestChangeSetForHooks = changeSets?.length ? changeSets[changeSets.length - 1] : null;
  const activeFileForHooks = latestChangeSetForHooks?.changes?.[activeTabIndex] ?? null;
  const isReactComponent = !!activeFileForHooks?.filePath?.match(/\.(jsx|tsx)$/);

  useEffect(() => {
    if (!isReactComponent && showScreenshots) setShowScreenshots(false);
  }, [isReactComponent, showScreenshots]);

  useEffect(() => {
    if (!latestChangeSetForHooks?.id) return;

    const changeSetId = latestChangeSetForHooks.id;
    if (analysisReadyByChangeSetId[changeSetId]) return;
    if (analysisPollingByChangeSetId[changeSetId]) return;

    let cancelled = false;
    setAnalysisPollingByChangeSetId((prev) => ({ ...prev, [changeSetId]: true }));

    const pollOnce = async (): Promise<boolean> => {
      const ports = ['8083', '8081'];
      for (const port of ports) {
        try {
          const resp = await fetch(`http://localhost:${port}/analysis/${changeSetId}`);
          const data = await resp.json();
          if (data?.success && data?.analysis) return true;
        } catch {
          // try next port
        }
      }
      return false;
    };

    const start = async () => {
      const readyNow = await pollOnce();
      if (cancelled) return;

      if (readyNow) {
        setAnalysisReadyByChangeSetId((prev) => ({ ...prev, [changeSetId]: true }));
        setAnalysisPollingByChangeSetId((prev) => ({ ...prev, [changeSetId]: false }));
        return;
      }

      const intervalId = window.setInterval(async () => {
        const ready = await pollOnce();
        if (cancelled) return;
        if (ready) {
          window.clearInterval(intervalId);
          setAnalysisReadyByChangeSetId((prev) => ({ ...prev, [changeSetId]: true }));
          setAnalysisPollingByChangeSetId((prev) => ({ ...prev, [changeSetId]: false }));
        }
      }, 3000);

      return () => window.clearInterval(intervalId);
    };

    let cleanup: void | (() => void);
    start().then((c) => {
      cleanup = c;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      setAnalysisPollingByChangeSetId((prev) => ({ ...prev, [changeSetId]: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestChangeSetForHooks?.id]);

  if (!changeSets || changeSets.length === 0) {
    return (
      <div className="change-viewer">
        <div className="empty-state">
          <div style={{ color: 'var(--text-secondary)' }}>
            <Code2 size={28} />
          </div>
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

  // Helper function to extract component name from filename
  const getComponentName = (filePath: string): string => {
    const filename = getFileName(filePath);
    // Remove extension (.jsx, .tsx, .js, .ts)
    return filename.replace(/\.(jsx?|tsx?)$/, '');
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

  // Function to fetch component screenshots
  const fetchScreenshots = async () => {
    setScreenshots({ loading: true, before: '', after: '' });
    setShowScreenshots(true);

    try {
      const componentName = getComponentName(activeFile.filePath);
      const response = await fetch('http://localhost:3334/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beforeCode: activeFile.before,
          afterCode: activeFile.after,
          componentName,
        }),
      });

      const result = await response.json();

      if (result.success && result.before && result.after) {
        setScreenshots({
          loading: false,
          before: result.before,
          after: result.after,
          error: result.error,
        });
      } else {
        setScreenshots({
          loading: false,
          before: '',
          after: '',
          error: result.error || 'Failed to generate screenshots',
        });
      }
    } catch (error: any) {
      setScreenshots({
        loading: false,
        before: '',
        after: '',
        error: error.message || 'Failed to connect to sandbox server',
      });
    }
  };

  const renderSideBySideDiff = (before: string, after: string) => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    // Parse diff to find corresponding lines
    const diffLines = activeFile.diff?.split('\n') || [];
    const removedLines: { lineNum: number; content: string }[] = [];
    const addedLines: { lineNum: number; content: string }[] = [];
    
    let beforeLineNum = 0;
    let afterLineNum = 0;
    
    for (const line of diffLines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          beforeLineNum = parseInt(match[1]) - 1;
          afterLineNum = parseInt(match[2]) - 1;
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removedLines.push({ lineNum: beforeLineNum, content: line.substring(1) });
        beforeLineNum++;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines.push({ lineNum: afterLineNum, content: line.substring(1) });
        afterLineNum++;
      } else if (!line.startsWith('\\')) {
        beforeLineNum++;
        afterLineNum++;
      }
    }
    
    return { beforeLines, afterLines, removedLines, addedLines };
  };

  const renderCodePanel = (lines: string[], title: string, changedLines: { lineNum: number; content: string }[], isRemoved: boolean) => {
    const changedLineNums = new Set(changedLines.map(l => l.lineNum));
    const bgColor = isRemoved ? 'rgba(244,71,71,0.4)' : 'rgba(76,175,80,0.4)';
    
    // Create a map of line numbers to their highlighted content
    const highlightMap = new Map<number, JSX.Element[]>();
    
    // Find pairs of removed/added lines for character-level diff
    if (changedLines.length > 0) {
      const { removedLines, addedLines } = renderSideBySideDiff(activeFile.before, activeFile.after);
      
      if (isRemoved) {
        // Match removed lines with added lines for character diff
        removedLines.forEach((removed, idx) => {
          if (idx < addedLines.length) {
            const { oldHighlights } = getCharDiffs(removed.content, addedLines[idx].content);
            highlightMap.set(removed.lineNum, renderWithHighlights(removed.content, oldHighlights, bgColor));
          }
        });
      } else {
        // Match added lines with removed lines for character diff
        addedLines.forEach((added, idx) => {
          if (idx < removedLines.length) {
            const { newHighlights } = getCharDiffs(removedLines[idx].content, added.content);
            highlightMap.set(added.lineNum, renderWithHighlights(added.content, newHighlights, bgColor));
          }
        });
      }
    }
    
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ 
          fontFamily: 'var(--font-ui)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '1px',
          color: 'var(--text-secondary)',
          padding: '12px',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)'
        }}>
          {title}
        </div>
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          {lines.map((line, i) => {
            const isChanged = changedLineNums.has(i);
            const highlightedContent = highlightMap.get(i);
            
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  whiteSpace: 'pre',
                  background: isChanged ? (isRemoved ? 'rgba(248,81,73,0.15)' : 'rgba(46,160,67,0.15)') : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 50,
                    flexShrink: 0,
                    textAlign: 'right',
                    padding: '0 12px 0 8px',
                    userSelect: 'none',
                    color: 'var(--text-secondary)',
                    background: isChanged ? (isRemoved ? 'rgba(248,81,73,0.3)' : 'rgba(46,160,67,0.3)') : 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border)'
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ 
                  flex: 1, 
                  padding: '0 12px',
                  color: isChanged ? (isRemoved ? '#f85149' : '#3fb950') : 'var(--text-primary)'
                }}>
                  {highlightedContent || line || ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderUnifiedDiff = (diff: string | undefined) => {
    if (!diff) {
      return <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-ui)' }}>No diff available</div>;
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

  const renderScreenshotComparison = () => {
    if (!screenshots) return null;

    if (screenshots.loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          fontFamily: 'var(--font-ui)',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', display: 'inline-flex' }}>
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div>Rendering component screenshots...</div>
          </div>
        </div>
      );
    }

    if (screenshots.error || !screenshots.before || !screenshots.after) {
      return (
        <div style={{
          padding: '24px',
          fontFamily: 'var(--font-ui)',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <div style={{ color: 'var(--error)', marginBottom: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              Screenshot rendering failed
            </span>
          </div>
          <div style={{ fontSize: '12px' }}>
            {screenshots.error || 'Unable to render component'}
          </div>
          <button
            onClick={() => setShowScreenshots(false)}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Show Code Diff
          </button>
        </div>
      );
    }

    return (
      <div style={{ 
        display: 'flex', 
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
            padding: '12px',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)'
          }}>
            BEFORE
          </div>
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center'
          }}>
            <img 
              src={`data:image/png;base64,${screenshots.before}`} 
              alt="Before screenshot"
              style={{ maxWidth: '100%', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
        <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ 
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '1px',
            color: 'var(--text-secondary)',
            padding: '12px',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)'
          }}>
            AFTER
          </div>
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center'
          }}>
            <img 
              src={`data:image/png;base64,${screenshots.after}`} 
              alt="After screenshot"
              style={{ maxWidth: '100%', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} />
              Approve
            </span>
          </button>
          <button
            className="btn-rollback"
            onClick={() => onRollback(latestChangeSet.id)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CornerUpLeft size={14} />
              Rollback
            </span>
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
            {/* Eye button states:
                1) No analysis yet (disabled) — when analysis polling not started (should not happen after first change)
                2) Loading/analyzing (disabled w/ spinner) — while polling
                3) Ready (clickable) — when analysis found */}
            {analysisReadyByChangeSetId[latestChangeSet.id] ? (
              <button
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
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  color: 'var(--accent-blue)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Eye size={14} />
              </button>
            ) : analysisPollingByChangeSetId[latestChangeSet.id] ? (
              <button
                disabled
                title="Analyzing..."
                aria-label="Analyzing..."
                style={{
                  marginLeft: 8,
                  background: 'transparent',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  borderRadius: 4,
                  cursor: 'wait',
                  padding: '2px 6px',
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Loader2 size={14} className="animate-spin" />
              </button>
            ) : (
              <button
                disabled
                title="No analysis yet"
                aria-label="No analysis yet"
                style={{
                  marginLeft: 8,
                  background: 'transparent',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 12,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  userSelect: 'none',
                  opacity: 0.4,
                  cursor: 'not-allowed',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Eye size={14} />
              </button>
            )}

            {/* Only show component preview toggle for React component files */}
            {index === activeTabIndex && isReactComponent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchScreenshots();
                }}
                title="Component Preview"
                aria-label="Component Preview"
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
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <LayoutGrid size={14} />
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Section - Active Tab Content */}
      {activeFile && (
        <div className="tab-content">
          {showScreenshots && isReactComponent ? (
            <>
              <div style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    Component Preview
                  </span>
                  <button
                    onClick={() => setShowScreenshots(false)}
                    style={{
                      padding: '4px 12px',
                      background: 'transparent',
                      color: 'var(--accent-blue)',
                      border: '1px solid var(--accent-blue)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'var(--font-ui)'
                    }}
                  >
                    Show Code Diff
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {renderScreenshotComparison()}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ 
                display: 'flex', 
                height: '60%',
                borderBottom: '1px solid var(--border)',
                overflow: 'hidden'
              }}>
                {renderCodePanel(
                  activeFile.before.split('\n'),
                  'BEFORE',
                  renderSideBySideDiff(activeFile.before, activeFile.after).removedLines,
                  true
                )}
                <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
                {renderCodePanel(
                  activeFile.after.split('\n'),
                  'AFTER',
                  renderSideBySideDiff(activeFile.before, activeFile.after).addedLines,
                  false
                )}
              </div>
              <div style={{ 
                height: '40%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ 
                  fontFamily: 'var(--font-ui)',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  color: 'var(--text-secondary)',
                  padding: '12px',
                  textTransform: 'uppercase',
                  borderBottom: '1px solid var(--border)'
                }}>
                  DIFF
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {renderUnifiedDiff(activeFile.diff)}
                </div>
              </div>
            </>
          )}
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
