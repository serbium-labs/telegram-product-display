import { describe, expect, it } from 'vitest';

import { FixedWindowRateLimiter } from '../server/security/fixed-window-rate-limiter.js';

const CURRENT_TIME = 1_800_000_000_000;
const MAXIMUM_REQUESTS = 2;
const WINDOW_MILLISECONDS = 60_000;

describe('FixedWindowRateLimiter', (): void => {
  it('rejects requests beyond the per-key limit until the window expires', (): void => {
    const limiter = new FixedWindowRateLimiter(
      MAXIMUM_REQUESTS,
      WINDOW_MILLISECONDS,
    );

    expect(limiter.consume('user-1', CURRENT_TIME)).toBe(true);
    expect(limiter.consume('user-1', CURRENT_TIME)).toBe(true);
    expect(limiter.consume('user-1', CURRENT_TIME)).toBe(false);
    expect(limiter.consume('user-1', CURRENT_TIME + WINDOW_MILLISECONDS)).toBe(
      true,
    );
  });

  it('tracks users independently', (): void => {
    const limiter = new FixedWindowRateLimiter(
      MAXIMUM_REQUESTS,
      WINDOW_MILLISECONDS,
    );

    expect(limiter.consume('user-1', CURRENT_TIME)).toBe(true);
    expect(limiter.consume('user-2', CURRENT_TIME)).toBe(true);
  });
});
