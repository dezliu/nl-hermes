const REDACT_KEY_PATTERN = /password|token|apikey|authorization|secret|credential/i;

export function redact<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      REDACT_KEY_PATTERN.test(key) ? '[REDACTED]' : value,
    ),
  ) as T;
}
