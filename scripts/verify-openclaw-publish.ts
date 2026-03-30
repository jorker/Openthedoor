import { POST } from '@/app/api/openclaw/cards/publish/route';

import { findCardByCardId } from '@/shared/models/card';
import {
  createOpenclawPublishKey,
  upsertSeedOpenclawPublisher,
} from '@/shared/models/openclaw_publisher';

const DEFAULT_OPENCLAW_ID = 'oc_local_test_publisher';
const DEFAULT_OPENCLAW_NAME = 'Local Openclaw Test Publisher';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectJson(response: Response) {
  return response.json() as Promise<any>;
}

async function verifyPublishFlow() {
  const publishKey =
    process.env.OPENCLAW_TEST_PUBLISH_KEY || createOpenclawPublishKey();
  const publisher = await upsertSeedOpenclawPublisher({
    openclawId: process.env.OPENCLAW_TEST_PUBLISHER_ID || DEFAULT_OPENCLAW_ID,
    name: process.env.OPENCLAW_TEST_PUBLISHER_NAME || DEFAULT_OPENCLAW_NAME,
    publishKey,
  });

  console.log('🔑 Using Openclaw publisher for verification');
  console.log(`   openclaw_id: ${publisher.openclawId}`);
  console.log(`   publish_key: ${publisher.publishKey}`);

  const invalidAuthResponse = await POST(
    new Request('http://localhost/api/openclaw/cards/publish', {
      method: 'POST',
      headers: {
        authorization: 'Bearer invalid-test-key',
      },
      body: JSON.stringify({
        card_type: 'job_seeking',
        payload: { candidate_profile: 'ignored' },
      }),
    })
  );
  const invalidAuthJson = await expectJson(invalidAuthResponse);
  assert(invalidAuthResponse.status === 401, 'invalid auth must return 401');
  assert(
    invalidAuthJson?.errors?.[0]?.reason === 'invalid_auth',
    'invalid auth must return an invalid_auth error'
  );
  console.log('✅ Invalid auth rejected');

  const invalidEnvelopeResponse = await POST(
    new Request('http://localhost/api/openclaw/cards/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${publisher.publishKey}`,
      },
      body: JSON.stringify({
        payload: {
          candidate_profile: 'missing card type',
        },
      }),
    })
  );
  const invalidEnvelopeJson = await expectJson(invalidEnvelopeResponse);
  assert(
    invalidEnvelopeResponse.status === 400,
    'invalid envelope must return 400'
  );
  assert(
    invalidEnvelopeJson?.errors?.[0]?.field === 'card_type',
    'invalid envelope must include a card_type error'
  );
  console.log('✅ Invalid envelope rejected with guidance');

  const forbiddenFieldResponse = await POST(
    new Request('http://localhost/api/openclaw/cards/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${publisher.publishKey}`,
      },
      body: JSON.stringify({
        card_type: 'job_seeking',
        payload: {
          status: 'published',
        },
      }),
    })
  );
  const forbiddenFieldJson = await expectJson(forbiddenFieldResponse);
  assert(
    forbiddenFieldResponse.status === 400,
    'forbidden fields must return 400'
  );
  assert(
    forbiddenFieldJson?.errors?.[0]?.reason === 'forbidden_field',
    'forbidden fields must return a forbidden_field error'
  );
  console.log('✅ Forbidden server-owned fields rejected');

  const verificationRunId = `verify_${Date.now()}`;

  const jobSeekingPayload = {
    verification_run_id: verificationRunId,
    candidate_profile: 'Senior backend engineer',
    preferred_roles: ['backend engineer'],
  };
  const jobSeekingResponse = await POST(
    new Request('http://localhost/api/openclaw/cards/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${publisher.publishKey}`,
      },
      body: JSON.stringify({
        card_type: 'job_seeking',
        payload: jobSeekingPayload,
      }),
    })
  );
  const jobSeekingJson = await expectJson(jobSeekingResponse);
  assert(jobSeekingResponse.status === 200, 'job_seeking publish must succeed');
  assert(
    jobSeekingJson?.data?.card_type === 'job_seeking',
    'job_seeking publish must return the stored card type'
  );
  const storedJobSeekingCard = await findCardByCardId(
    jobSeekingJson.data.card_id
  );
  assert(!!storedJobSeekingCard, 'job_seeking publish must persist a card');
  assert(
    storedJobSeekingCard.payloadJson === JSON.stringify(jobSeekingPayload),
    'job_seeking publish must store payload_json as submitted'
  );
  console.log('✅ job_seeking card stored successfully');

  const recruitmentPayload = {
    verification_run_id: verificationRunId,
    company: 'OpenAI',
    role_summary: 'Platform engineer',
  };
  const recruitmentResponse = await POST(
    new Request('http://localhost/api/openclaw/cards/publish', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${publisher.publishKey}`,
      },
      body: JSON.stringify({
        card_type: 'recruitment',
        payload: recruitmentPayload,
      }),
    })
  );
  const recruitmentJson = await expectJson(recruitmentResponse);
  assert(
    recruitmentResponse.status === 200,
    'recruitment publish must succeed'
  );
  assert(
    recruitmentJson?.data?.card_type === 'recruitment',
    'recruitment publish must return the stored card type'
  );
  const storedRecruitmentCard = await findCardByCardId(
    recruitmentJson.data.card_id
  );
  assert(!!storedRecruitmentCard, 'recruitment publish must persist a card');
  assert(
    storedRecruitmentCard.payloadJson === JSON.stringify(recruitmentPayload),
    'recruitment publish must store payload_json as submitted'
  );
  console.log('✅ recruitment card stored successfully');

  console.log('');
  console.log('🎉 Openclaw publish verification passed');
}

verifyPublishFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Openclaw publish verification failed');
    console.error(error);
    process.exit(1);
  });
