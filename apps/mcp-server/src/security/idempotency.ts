export interface CachedResponse {
  key: string;
  userId: string;
  toolName: string;
  response: unknown;
  timestamp: number;
}

export class IdempotencyStore {
  private cache = new Map<string, CachedResponse>();
  private readonly ttlMs: number;

  constructor(ttlHours = 24) {
    this.ttlMs = ttlHours * 3600 * 1000;
  }

  private compositeKey(userId: string, key: string): string {
    return `${userId}::${key}`;
  }

  public get(userId: string, key: string): unknown | null {
    const k = this.compositeKey(userId, key);
    const entry = this.cache.get(k);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(k);
      return null;
    }

    return entry.response;
  }

  public set(userId: string, key: string, toolName: string, response: unknown): void {
    const k = this.compositeKey(userId, key);
    this.cache.set(k, {
      key,
      userId,
      toolName,
      response,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const idempotencyStore = new IdempotencyStore();
