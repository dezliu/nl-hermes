const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /1[3-9]\d{9}/g;
const MAX_PROMPT_LENGTH = 512;

export function sanitizePrompt(prompt: string): string {
  let sanitized = prompt
    .replace(EMAIL_PATTERN, '[email]')
    .replace(PHONE_PATTERN, '[phone]')
    .trim();

  if (sanitized.length > MAX_PROMPT_LENGTH) {
    sanitized = `${sanitized.slice(0, MAX_PROMPT_LENGTH)}…[truncated]`;
  }

  return sanitized;
}

export function summarizeOutput(output: unknown): unknown {
  if (typeof output === 'string') {
    return output.length > 256 ? `${output.slice(0, 256)}…` : output;
  }
  if (output && typeof output === 'object') {
    const json = JSON.stringify(output);
    return json.length > 512 ? `${json.slice(0, 512)}…` : output;
  }
  return output;
}
