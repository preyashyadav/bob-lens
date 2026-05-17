import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Code2, CornerUpLeft, Eye, LayoutGrid, Loader2 } from 'lucide-react';
import { ChangeSet } from '../../../types/change';
import AnalysisPanel from './AnalysisPanel';

const Tooltip = ({ text, children }: { text: string; children: ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            background: '#1a1a1a',
            border: '1px solid #353b41',
            color: '#ecf1f8',
            fontSize: '11px',
            fontFamily: 'var(--font-ui)',
            padding: '4px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

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

function ChangeViewer({ changeSets, onApprove, onRollback, activeTabIndex, onTabChange }: ChangeViewerProps) {
  const [analysisChangeId, setAnalysisChangeId] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<ScreenshotState | null>(null);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [analysisReadyByChangeSetId, setAnalysisReadyByChangeSetId] = useState<Record<string, boolean>>({});
  const [analysisPollingByChangeSetId, setAnalysisPollingByChangeSetId] = useState<Record<string, boolean>>({});

  const latestChangeSetForHooks = changeSets?.length ? changeSets[changeSets.length - 1] : null;
  const activeFileForHooks = latestChangeSetForHooks?.changes?.[activeTabIndex] ?? null;
  const isReactFile = !!activeFileForHooks?.filePath?.match(/\.(jsx|tsx)$/i);
  const activeScreenshotKey =
    latestChangeSetForHooks?.id && activeFileForHooks?.filePath ? `${latestChangeSetForHooks.id}:${activeFileForHooks.filePath}` : null;
  const activeScreenshotKeyRef = useRef<string | null>(activeScreenshotKey);

  useEffect(() => {
    activeScreenshotKeyRef.current = activeScreenshotKey;
  }, [activeScreenshotKey]);

  // Reset screenshots whenever the active file (or change set) changes.
  useEffect(() => {
    setScreenshots(null);
  }, [activeScreenshotKey, activeTabIndex, latestChangeSetForHooks?.id, activeFileForHooks?.filePath]);

  useEffect(() => {
    if (!isReactFile && showScreenshots) setShowScreenshots(false);
  }, [isReactFile, showScreenshots]);

  const fetchScreenshotsForActiveFile = useCallback(async () => {
    if (!activeFileForHooks?.filePath) return;

    const requestKey = activeScreenshotKeyRef.current;
    setScreenshots({ loading: true, before: '', after: '' });

    try {
      const componentName =
        activeFileForHooks.filePath
          .split('/')
          .pop()
          ?.replace(/\.(jsx|tsx)$/i, '') || 'Component';

      const response = await fetch('http://localhost:3334/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beforeCode: activeFileForHooks.before || '',
          afterCode: activeFileForHooks.after || '',
          componentName,
        }),
      });

      const result = await response.json();

      // Ignore stale responses (user switched tabs/files mid-request).
      if (activeScreenshotKeyRef.current !== requestKey) return;

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
      if (activeScreenshotKeyRef.current !== requestKey) return;
      setScreenshots({
        loading: false,
        before: '',
        after: '',
        error: error.message || 'Failed to connect to sandbox server',
      });
    }
  }, [activeFileForHooks]);

  // When preview is shown, fetch screenshots for the currently active file/change.
  useEffect(() => {
    if (!showScreenshots) return;
    if (!isReactFile) return;
    if (!activeFileForHooks) return;
    if (screenshots) return; // already loaded (or currently loading) for this active key

    fetchScreenshotsForActiveFile();
  }, [showScreenshots, isReactFile, activeScreenshotKey, activeFileForHooks, screenshots, fetchScreenshotsForActiveFile]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.8); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
  const analysisLoading = Boolean(analysisPollingByChangeSetId[latestChangeSet.id]);

  // Helper function to get filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  const fileTypeColor = (fileType: string): string => {
    switch (fileType) {
      case 'frontend':
        return '#42be65';
      case 'backend':
        return '#f1c21b';
      case 'config':
        return '#7aabff';
      default:
        return '#353b41';
    }
  };

  const fileTypeLabel = (fileType: string): string => {
    switch (fileType) {
      case 'frontend':
        return 'F';
      case 'backend':
        return 'B';
      case 'config':
        return 'C';
      default:
        return '?';
    }
  };

  const renderScreenshotComparison = () => {
    if (!screenshots) return null;

    if (screenshots.loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#697077', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>
          Rendering component with Puppeteer...
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
          <div style={{ color: '#fa4d56', marginBottom: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              Screenshot rendering failed
            </span>
          </div>
          <div style={{ fontSize: '12px' }}>
            {screenshots.error || 'Unable to render component'}
          </div>
          <Tooltip text="View side-by-side code diff">
            <button
              onClick={() => setShowScreenshots(false)}
              title="View side-by-side code diff"
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: 'transparent',
                color: '#7aabff',
                border: '1px solid #7aabff',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Show Code Diff
            </button>
          </Tooltip>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: '#353b41' }}>
        <div style={{ background: '#171717', padding: '16px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#697077',
              fontFamily: 'var(--font-ui)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            BEFORE
          </div>
          <img
            src={`data:image/png;base64,${screenshots.before}`}
            alt="Before screenshot"
            style={{ width: '100%', borderRadius: '2px', border: '1px solid #353b41' }}
          />
        </div>
        <div style={{ background: '#171717', padding: '16px' }}>
          <div
            style={{
              fontSize: '10px',
              color: '#697077',
              fontFamily: 'var(--font-ui)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            AFTER
          </div>
          <img
            src={`data:image/png;base64,${screenshots.after}`}
            alt="After screenshot"
            style={{ width: '100%', borderRadius: '2px', border: '1px solid #353b41' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="change-viewer">
      {/* Top Section - Task Header */}
      <div
        style={{
          background: '#171717',
          borderBottom: '1px solid #353b41',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 12,
              color: '#ecf1f8',
              fontFamily: 'var(--font-ui)',
              fontWeight: 500,
            }}
          >
            {latestChangeSet.description || 'Code Changes'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#697077',
              fontFamily: 'var(--font-ui)',
              fontWeight: 300,
            }}
          >
            {new Date(latestChangeSet.timestamp).toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => onApprove(latestChangeSet.id)}
            style={{
              background: 'transparent',
              border: '1px solid #7aabff',
              color: '#7aabff',
              borderRadius: 4,
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Approve"
            aria-label="Approve"
          >
            <Check size={14} />
            Approve
          </button>
          <button
            onClick={() => onRollback(latestChangeSet.id)}
            style={{
              background: 'transparent',
              border: '1px solid #7aabff',
              color: '#7aabff',
              borderRadius: 4,
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Rollback"
            aria-label="Rollback"
          >
            <CornerUpLeft size={14} />
            Rollback
          </button>
        </div>
      </div>

      {/* Middle Section - File Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          borderBottom: '1px solid #353b41',
          background: '#171717',
          padding: '0 16px',
          overflowX: 'auto',
        }}
      >
        {latestChangeSet.changes.map((file, index) => {
          const isActive = index === activeTabIndex;
          const fileName = getFileName(file.filePath);
          const fileType = fileTypeLabel(file.fileType);
          const typeColor = fileTypeColor(file.fileType);

          return (
            <button
              key={index}
              onClick={() => onTabChange(index)}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                color: isActive ? '#ffffff' : '#697077',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #7aabff' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: analysisLoading ? '#7aabff' : typeColor,
                  display: 'inline-block',
                  animation: analysisLoading ? 'pulse 1.5s ease-in-out infinite' : undefined,
                }}
              />
              {fileName}
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 4px',
                  border: '1px solid #353b41',
                  borderRadius: '4px',
                  color: '#697077',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {fileType}
              </span>

              {analysisReadyByChangeSetId[latestChangeSet.id] ? (
                <Tooltip text="View analysis">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnalysisChangeId(latestChangeSet.id);
                    }}
                    title="View analysis"
                    aria-label="View analysis"
                    style={{
                      marginLeft: 6,
                      background: 'transparent',
                      border: '1px solid #353b41',
                      borderRadius: 4,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                      color: '#7aabff',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </Tooltip>
              ) : analysisPollingByChangeSetId[latestChangeSet.id] ? (
                <Tooltip text="Analyzing...">
                  <button
                    disabled
                    title="Analyzing..."
                    aria-label="Analyzing..."
                    style={{
                      marginLeft: 6,
                      background: 'transparent',
                      border: '1px solid #353b41',
                      color: '#697077',
                      borderRadius: 4,
                      cursor: 'wait',
                      padding: '2px 6px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                      opacity: 0.8,
                    }}
                  >
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip text="Waiting for analysis...">
                  <button
                    disabled
                    title="Waiting for analysis..."
                    aria-label="Waiting for analysis..."
                    style={{
                      marginLeft: 6,
                      background: 'transparent',
                      border: '1px solid #353b41',
                      color: '#697077',
                      borderRadius: 4,
                      padding: '2px 6px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                      opacity: 0.4,
                      cursor: 'not-allowed',
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </Tooltip>
              )}

              {isActive && isReactFile && (
                <Tooltip text="See before/after visual render of this component">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowScreenshots((prev) => {
                        const next = !prev;
                        return next;
                      });
                    }}
                    title="Component preview"
                    aria-label="Component preview"
                    style={{
                      marginLeft: 6,
                      background: 'transparent',
                      border: '1px solid #353b41',
                      color: '#697077',
                      borderRadius: 4,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <LayoutGrid size={13} />
                  </button>
                </Tooltip>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Section - Active Tab Content */}
      {activeFile && (
        <div className="tab-content">
          {showScreenshots && isReactFile ? (
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
                  <Tooltip text="View side-by-side code diff">
                    <button
                      onClick={() => setShowScreenshots(false)}
                      title="View side-by-side code diff"
                      style={{
                        padding: '4px 12px',
                        background: 'transparent',
                        color: 'var(--accent-blue)',
                        border: '1px solid var(--accent-blue)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      Show Code Diff
                    </button>
                  </Tooltip>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {renderScreenshotComparison()}
                </div>
              </div>
            </>
          ) : (
            <>
              {(() => {
                const beforeLines = activeFile.before.split('\n');
                const afterLines = activeFile.after.split('\n');
                const diffLines = (activeFile.diff || '').split('\n');

                return (
                  <>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0',
                        borderTop: '1px solid #353b41',
                        flex: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          borderRight: '1px solid #353b41',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            padding: '6px 16px',
                            background: '#171717',
                            borderBottom: '1px solid #353b41',
                            fontSize: '10px',
                            fontFamily: 'var(--font-ui)',
                            color: '#697077',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontWeight: 500,
                          }}
                        >
                          BEFORE
                        </div>
                        <div style={{ overflow: 'auto', flex: 1, background: '#171717' }}>
                          {beforeLines.map((line, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                lineHeight: '20px',
                              }}
                            >
                              <span
                                style={{
                                  minWidth: '40px',
                                  textAlign: 'right',
                                  paddingRight: '12px',
                                  color: '#697077',
                                  userSelect: 'none',
                                  fontSize: '11px',
                                }}
                              >
                                {i + 1}
                              </span>
                              <span style={{ color: '#ecf1f8', padding: '0 16px 0 0', whiteSpace: 'pre' }}>
                                {line}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div
                          style={{
                            padding: '6px 16px',
                            background: '#171717',
                            borderBottom: '1px solid #353b41',
                            fontSize: '10px',
                            fontFamily: 'var(--font-ui)',
                            color: '#697077',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontWeight: 500,
                          }}
                        >
                          AFTER
                        </div>
                        <div style={{ overflow: 'auto', flex: 1, background: '#171717' }}>
                          {afterLines.map((line, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                lineHeight: '20px',
                              }}
                            >
                              <span
                                style={{
                                  minWidth: '40px',
                                  textAlign: 'right',
                                  paddingRight: '12px',
                                  color: '#697077',
                                  userSelect: 'none',
                                  fontSize: '11px',
                                }}
                              >
                                {i + 1}
                              </span>
                              <span style={{ color: '#ecf1f8', padding: '0 16px 0 0', whiteSpace: 'pre' }}>
                                {line}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #353b41', background: '#171717' }}>
                      <div
                        style={{
                          padding: '6px 16px',
                          fontSize: '10px',
                          fontFamily: 'var(--font-ui)',
                          color: '#697077',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          borderBottom: '1px solid #353b41',
                        }}
                      >
                        DIFF
                      </div>

                      {diffLines.map((line, i) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++');
                        const isDel = line.startsWith('-') && !line.startsWith('---');
                        const isHunk = line.startsWith('@@');

                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              background: isAdd
                                ? 'rgba(66,190,101,0.08)'
                                : isDel
                                  ? 'rgba(250,77,86,0.08)'
                                  : isHunk
                                    ? 'rgba(122,171,255,0.06)'
                                    : 'transparent',
                              borderLeft: isAdd
                                ? '2px solid #42be65'
                                : isDel
                                  ? '2px solid #fa4d56'
                                  : isHunk
                                    ? '2px solid #7aabff'
                                    : '2px solid transparent',
                            }}
                          >
                            <span
                              style={{
                                minWidth: '40px',
                                textAlign: 'right',
                                paddingRight: '12px',
                                paddingLeft: '8px',
                                color: '#697077',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                lineHeight: '20px',
                                userSelect: 'none',
                                borderRight: '1px solid #353b41',
                              }}
                            >
                              {i + 1}
                            </span>
                            <span
                              style={{
                                width: '20px',
                                textAlign: 'center',
                                color: isAdd ? '#42be65' : isDel ? '#fa4d56' : '#697077',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                lineHeight: '20px',
                                fontWeight: 600,
                              }}
                            >
                              {isAdd ? '+' : isDel ? '-' : isHunk ? '' : ' '}
                            </span>
                            <span
                              style={{
                                flex: 1,
                                padding: '0 16px 0 8px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                lineHeight: '20px',
                                color: isHunk ? '#7aabff' : '#ecf1f8',
                                whiteSpace: 'pre',
                              }}
                            >
                              {line.replace(/^[+-]/, '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
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
