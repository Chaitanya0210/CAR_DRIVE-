export class RateLimitExceededError extends Error {
  public readonly code = 429;
  constructor(
    message: string,
    public readonly retryAfterSeconds = 60,
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests = 60, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  /**
   * Asserts caller is within rate limits. Throws RateLimitExceededError if breached.
   */
  public checkLimit(userId: string): void {
    const now = Date.now();
    const timestamps = this.requests.get(userId) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      const oldestValid = validTimestamps[0];
      const waitTimeSec = Math.ceil((oldestValid + this.windowMs - now) / 1000);
      throw new RateLimitExceededError(
        `Rate limit exceeded: Max ${this.maxRequests} requests per minute allowed. Try again in ${waitTimeSec}s.`,
        waitTimeSec,
      );
    }

    validTimestamps.push(now);
    this.requests.set(userId, validTimestamps);
  }

  public reset(userId?: string): void {
    if (userId) {
      this.requests.delete(userId);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new SlidingWindowRateLimiter(60, 60);
