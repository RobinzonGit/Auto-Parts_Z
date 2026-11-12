/** Простой клиентский логгер с зеркалированием в console и кольцевым буфером. */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

const MAX_ENTRIES = 300;
const buffer: LogEntry[] = [];

function push(entry: LogEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

function serialize(data: unknown): unknown {
  if (data instanceof Error) {
    return { name: data.name, message: data.message, stack: data.stack };
  }
  return data;
}

function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const entry: LogEntry = { ts: new Date().toISOString(), level, scope, message, data: serialize(data) };
  push(entry);
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (data !== undefined) consoleFn(`[${scope}] ${message}`, entry.data);
  else consoleFn(`[${scope}] ${message}`);
}

/** Логгер приложения: logger.info('auth', 'Вход выполнен', { email }). */
export const logger = {
  debug: (scope: string, message: string, data?: unknown) => log('debug', scope, message, data),
  info: (scope: string, message: string, data?: unknown) => log('info', scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => log('warn', scope, message, data),
  error: (scope: string, message: string, data?: unknown) => log('error', scope, message, data),
  /** Возвращает копию буфера логов (для отладки в консоли браузера). */
  dump: (): LogEntry[] => [...buffer],
};

// Отладочный доступ из консоли: window.__autopartsLogger.dump()
declare global {
  interface Window {
    __autopartsLogger?: typeof logger;
  }
}
if (typeof window !== 'undefined') {
  window.__autopartsLogger = logger;
}
