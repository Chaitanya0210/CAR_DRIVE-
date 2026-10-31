/**
 * Input sanitizer:
 * Strips XSS script tags, javascript: protocols, dangerous SQL control sequences, and null bytes,
 * while safely preserving legitimate multibyte UTF-8 characters (Hindi, Marathi, English).
 */

const DANGEROUS_PATTERNS = [
  /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
  /<\s*script[^>]*>/gi,
  /<\s*\/\s*script\s*>/gi,
  /on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi,
  /javascript\s*:[^\s]*/gi,
  /vbscript\s*:[^\s]*/gi,
  /--\s*$/gm, // Trailing SQL comments
  /\0/g, // Null bytes
];

export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

export function sanitizeDeep<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      cleaned[key] = sanitizeDeep(value);
    }
    return cleaned as T;
  }

  return input;
}
