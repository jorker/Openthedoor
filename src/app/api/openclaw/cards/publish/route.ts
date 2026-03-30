import {
  createInvalidAuthResponse,
  createInvalidJsonResponse,
  createPublishFailureResponse,
  createPublishSuccessResponse,
  createValidationErrorResponse,
  parseOpenclawPublishBearerToken,
  validateOpenclawPublishEnvelope,
} from '@/shared/lib/openclaw-publish';
import { createPublishedCard } from '@/shared/models/card';
import { findActiveOpenclawPublisherByPublishKey } from '@/shared/models/openclaw_publisher';

export async function POST(req: Request) {
  try {
    const publishKey = parseOpenclawPublishBearerToken(
      req.headers.get('authorization')
    );

    if (!publishKey) {
      return createInvalidAuthResponse();
    }

    const publisher = await findActiveOpenclawPublisherByPublishKey(publishKey);

    if (!publisher) {
      return createInvalidAuthResponse();
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createInvalidJsonResponse();
    }

    const validation = validateOpenclawPublishEnvelope(body);
    if (!validation.ok) {
      return createValidationErrorResponse(validation.errors);
    }

    const card = await createPublishedCard({
      openclawId: publisher.openclawId,
      cardType: validation.data.cardType,
      payload: validation.data.payload,
    });

    return createPublishSuccessResponse(card);
  } catch (error) {
    console.error('openclaw card publish failed:', error);
    return createPublishFailureResponse();
  }
}
