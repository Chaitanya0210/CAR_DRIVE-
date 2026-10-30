export class PromptInjectionDetectedError extends Error {
  public readonly code = 400;
  constructor(
    message: string,
    public readonly detectedPatterns: string[] = [],
  ) {
    super(message);
    this.name = 'PromptInjectionDetectedError';
  }
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+prompt\s+(override|leak|reveal|bypass)/i,
  /you\s+are\s+now\s+(unconstrained|dan|developer\s+mode)/i,
  /<\/?system>/i,
  /<\/?script.*?>/i,
  /grant\s+admin\s+role/i,
  /disregard\s+safety\s+checks/i,
  /refund\s+(all\s+)?(escrow|deposits?|money)\s+to/i,
  /drop\s+table\s+/i,
  /delete\s+from\s+users/i,
];

/**
 * Scans string for malicious prompt injection or override patterns.
 * If strictlyEnforced is true, throws PromptInjectionDetectedError.
 * Otherwise, sanitizes and neutralizes suspicious tokens.
 */
export function scanAndSanitizeText(
  text: string,
  strictlyEnforced = false,
): { sanitized: string; isInjected: boolean; patterns: string[] } {
  if (!text || typeof text !== 'string') {
    return { sanitized: text, isInjected: false, patterns: [] };
  }

  const detected: string[] = [];
  let clean = text;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      detected.push(pattern.source);
      if (strictlyEnforced) {
        throw new PromptInjectionDetectedError(
          `Security violation: Prompt injection or malicious control sequence detected in input text.`,
          detected,
        );
      }
      // Neutralize malicious instruction by replacing with [REDACTED_SECURITY_ALERT]
      clean = clean.replace(pattern, '[REDACTED_INJECTION_ATTEMPT]');
    }
  }

  return {
    sanitized: clean,
    isInjected: detected.length > 0,
    patterns: detected,
  };
}

/**
 * Deeply scans an arbitrary object/record for prompt injection in all string properties.
 */
export function deepScanObject<T>(obj: T, strictlyEnforced = false): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepScanObject(item, strictlyEnforced)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const { sanitized } = scanAndSanitizeText(value, strictlyEnforced);
      result[key] = sanitized;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepScanObject(value, strictlyEnforced);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
