import { describe, expect, it } from 'vitest';

import { respData, respErr, respOk } from './resp';

describe('resp helpers', () => {
  it('respOk returns the standard success payload', async () => {
    const response = respOk();

    await expect(response.json()).resolves.toEqual({
      code: 0,
      message: 'ok',
    });
  });

  it('respErr returns the provided message', async () => {
    const response = respErr('boom');

    await expect(response.json()).resolves.toEqual({
      code: -1,
      message: 'boom',
    });
  });

  it('respData preserves falsy payloads instead of replacing them', async () => {
    const response = respData(0);

    await expect(response.json()).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: 0,
    });
  });
});
