import { redact } from './redact.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (operation: string, fields?: LogFields) => void;
  info: (operation: string, fields?: LogFields) => void;
  warn: (operation: string, fields?: LogFields) => void;
  error: (operation: string, fields?: LogFields) => void;
  child: (bindings: LogFields) => Logger;
};

export type LoggerOptions = {
  service: string;
  bindings?: LogFields;
  sink?: (entry: StructuredLogEntry) => void;
};

export type StructuredLogEntry = {
  level: LogLevel;
  operation: string;
  service: string;
  timestamp: string;
  fields: LogFields;
};

function serializeError(err: unknown): LogFields | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message };
  }
  return { message: String(err) };
}

function normalizeFields(fields?: LogFields): LogFields {
  if (!fields) return {};
  const normalized = { ...fields };
  if ('err' in normalized) {
    normalized.error = serializeError(normalized.err);
    delete normalized.err;
  }
  if ('body' in normalized && normalized.body && typeof normalized.body === 'object') {
    normalized.body = redact(normalized.body as Record<string, unknown>);
  }
  return normalized;
}

function writeLog(
  level: LogLevel,
  operation: string,
  service: string,
  bindings: LogFields,
  fields: LogFields | undefined,
  sink: (entry: StructuredLogEntry) => void,
): void {
  const entry: StructuredLogEntry = {
    level,
    operation,
    service,
    timestamp: new Date().toISOString(),
    fields: { ...bindings, ...normalizeFields(fields) },
  };
  sink(entry);
}

function defaultSink(entry: StructuredLogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const { service, bindings = {}, sink = defaultSink } = options;

  const log =
    (level: LogLevel) =>
    (operation: string, fields?: LogFields): void => {
      writeLog(level, operation, service, bindings, fields, sink);
    };

  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    child: (childBindings: LogFields) =>
      createLogger({ service, bindings: { ...bindings, ...childBindings }, sink }),
  };
}
