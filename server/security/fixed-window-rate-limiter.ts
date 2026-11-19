const MAXIMUM_TRACKED_KEYS = 10_000;

interface RateLimitRecord {
  readonly expiresAt: number;
  readonly requestCount: number;
}

export class FixedWindowRateLimiter {
  readonly #maximumRequests: number;
  readonly #records = new Map<string, RateLimitRecord>();
  readonly #windowMilliseconds: number;

  public constructor(maximumRequests: number, windowMilliseconds: number) {
    this.#maximumRequests = maximumRequests;
    this.#windowMilliseconds = windowMilliseconds;
  }

  public consume(key: string, currentTime: number = Date.now()): boolean {
    const currentRecord: RateLimitRecord | undefined = this.#records.get(key);

    if (currentRecord === undefined) {
      this.removeExpiredRecords(currentTime);

      return this.createRecord(key, currentTime);
    }

    if (currentRecord.expiresAt <= currentTime) {
      this.#records.delete(key);
      this.removeExpiredRecords(currentTime);

      return this.createRecord(key, currentTime);
    }

    if (currentRecord.requestCount >= this.#maximumRequests) {
      return false;
    }

    this.#records.set(key, {
      expiresAt: currentRecord.expiresAt,
      requestCount: currentRecord.requestCount + 1,
    });

    return true;
  }

  private createRecord(key: string, currentTime: number): boolean {
    if (this.#records.size >= MAXIMUM_TRACKED_KEYS) {
      return false;
    }

    this.#records.set(key, {
      expiresAt: currentTime + this.#windowMilliseconds,
      requestCount: 1,
    });

    return true;
  }

  private removeExpiredRecords(currentTime: number): void {
    this.#records.forEach((record: RateLimitRecord, key: string): void => {
      if (record.expiresAt <= currentTime) {
        this.#records.delete(key);
      }
    });
  }
}
