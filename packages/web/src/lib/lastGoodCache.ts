/**
 * In-process TTL cache that never forgets the last successful value.
 * A failed refresh returns that value marked stale instead of throwing —
 * unless there has never been a success, in which case the error propagates.
 */

export type CacheHit<T> = {
  value: T;
  stale: boolean;
  staleReason: string | null;
  fetchedAt: number;
};

export class LastGoodCache<T> {
  private value: T | undefined;
  private fetchedAt = 0;
  private inflight: Promise<T> | null = null;
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  async get(loader: () => Promise<T>): Promise<CacheHit<T>> {
    const now = Date.now();
    if (this.value !== undefined && now - this.fetchedAt < this.ttlMs) {
      return {
        value: this.value,
        stale: false,
        staleReason: null,
        fetchedAt: this.fetchedAt,
      };
    }

    try {
      if (!this.inflight) {
        this.inflight = loader().finally(() => {
          this.inflight = null;
        });
      }
      const value = await this.inflight;
      this.value = value;
      this.fetchedAt = Date.now();
      return {
        value,
        stale: false,
        staleReason: null,
        fetchedAt: this.fetchedAt,
      };
    } catch (e) {
      if (this.value !== undefined) {
        return {
          value: this.value,
          stale: true,
          staleReason: errorMessage(e),
          fetchedAt: this.fetchedAt,
        };
      }
      throw e;
    }
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
