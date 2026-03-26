import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enforceMinIntervalRateLimit } from './rate-limit';

type RateLimitGlobal = typeof globalThis & {
  __minIntervalRateLimitStore?: Map<string, number>;
};

describe('enforceMinIntervalRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    (globalThis as RateLimitGlobal).__minIntervalRateLimitStore = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as RateLimitGlobal).__minIntervalRateLimitStore = undefined;
  });

  it('allows the first request for a key', () => {
    const request = new Request('http://localhost/api/test', {
      method: 'GET',
      headers: {
        'x-forwarded-for': '1.2.3.4',
        cookie: 'session=abc',
      },
    });

    expect(
      enforceMinIntervalRateLimit(request, { intervalMs: 2_000 })
    ).toBeNull();
  });

  it('returns 429 when the same key repeats within the interval', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'GET',
      headers: {
        'x-forwarded-for': '1.2.3.4',
        cookie: 'session=abc',
      },
    });

    expect(
      enforceMinIntervalRateLimit(request, { intervalMs: 2_000 })
    ).toBeNull();

    vi.advanceTimersByTime(1_000);

    const response = enforceMinIntervalRateLimit(request, {
      intervalMs: 2_000,
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get('retry-after')).toBe('1');
    await expect(response?.json()).resolves.toMatchObject({
      error: 'too_many_requests',
    });
  });
});
