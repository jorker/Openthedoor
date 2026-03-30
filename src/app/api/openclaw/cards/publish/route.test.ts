import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const { findActiveOpenclawPublisherByPublishKey, createPublishedCard } =
  vi.hoisted(() => ({
    findActiveOpenclawPublisherByPublishKey: vi.fn(),
    createPublishedCard: vi.fn(),
  }));

vi.mock('@/shared/models/openclaw_publisher', () => ({
  findActiveOpenclawPublisherByPublishKey,
}));

vi.mock('@/shared/models/card', () => ({
  createPublishedCard,
  CardType: {
    JOB_SEEKING: 'job_seeking',
    RECRUITMENT: 'recruitment',
  },
}));

describe('POST /api/openclaw/cards/publish', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests without a bearer token', async () => {
    const response = await POST(
      new Request('http://localhost/api/openclaw/cards/publish', {
        method: 'POST',
        body: JSON.stringify({
          card_type: 'job_seeking',
          payload: { candidate_profile: 'backend engineer' },
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: -1,
      message: 'invalid auth',
    });
    expect(findActiveOpenclawPublisherByPublishKey).not.toHaveBeenCalled();
    expect(createPublishedCard).not.toHaveBeenCalled();
  });

  it('returns structured validation errors before persistence', async () => {
    findActiveOpenclawPublisherByPublishKey.mockResolvedValue({
      openclawId: 'oc_test_publisher',
      status: 'active',
    });

    const response = await POST(
      new Request('http://localhost/api/openclaw/cards/publish', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ocpk_valid_key',
        },
        body: JSON.stringify({
          card_type: 'job_seeking',
          payload: { status: 'published' },
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: -1,
      message: 'validation failed',
      errors: [
        {
          field: 'payload.status',
          reason: 'forbidden_field',
          guidance:
            'Remove `status` from the request. Openthedoor sets card status on the server after the publish request succeeds.',
        },
      ],
    });
    expect(createPublishedCard).not.toHaveBeenCalled();
  });

  it('publishes a card for a valid Openclaw publisher', async () => {
    findActiveOpenclawPublisherByPublishKey.mockResolvedValue({
      openclawId: 'oc_test_publisher',
      status: 'active',
    });
    createPublishedCard.mockResolvedValue({
      cardId: 'card_123',
      openclawId: 'oc_test_publisher',
      cardType: 'recruitment',
      status: 'published',
      payloadJson: '{"company":"OpenAI"}',
      createdAt: new Date('2026-03-30T10:00:00.000Z'),
      updatedAt: new Date('2026-03-30T10:00:00.000Z'),
    });

    const response = await POST(
      new Request('http://localhost/api/openclaw/cards/publish', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ocpk_valid_key',
        },
        body: JSON.stringify({
          card_type: 'recruitment',
          payload: { company: 'OpenAI' },
        }),
      })
    );

    expect(findActiveOpenclawPublisherByPublishKey).toHaveBeenCalledWith(
      'ocpk_valid_key'
    );
    expect(createPublishedCard).toHaveBeenCalledWith({
      openclawId: 'oc_test_publisher',
      cardType: 'recruitment',
      payload: { company: 'OpenAI' },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      code: 0,
      message: 'ok',
      data: {
        card_id: 'card_123',
        card_type: 'recruitment',
        status: 'published',
        created_at: '2026-03-30T10:00:00.000Z',
        updated_at: '2026-03-30T10:00:00.000Z',
      },
    });
  });
});
