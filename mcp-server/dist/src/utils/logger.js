const LOG_LEVEL = (process.env.LOG_LEVEL || 'info');
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
function shouldLog(level) {
    return levels[level] >= levels[LOG_LEVEL];
}
export function debug(...args) {
    if (shouldLog('debug')) {
        console.error('[DEBUG]', ...args);
    }
}
export function info(...args) {
    if (shouldLog('info')) {
        console.error('[INFO]', ...args);
    }
}
export function warn(...args) {
    if (shouldLog('warn')) {
        console.error('[WARN]', ...args);
    }
}
export function error(...args) {
    if (shouldLog('error')) {
        console.error('[ERROR]', ...args);
    }
}
// Made with Bob
