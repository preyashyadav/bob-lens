type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[LOG_LEVEL];
}

export function debug(...args: any[]): void {
  if (shouldLog('debug')) {
    console.error('[DEBUG]', ...args);
  }
}

export function info(...args: any[]): void {
  if (shouldLog('info')) {
    console.error('[INFO]', ...args);
  }
}

export function warn(...args: any[]): void {
  if (shouldLog('warn')) {
    console.error('[WARN]', ...args);
  }
}

export function error(...args: any[]): void {
  if (shouldLog('error')) {
    console.error('[ERROR]', ...args);
  }
}

// Made with Bob
