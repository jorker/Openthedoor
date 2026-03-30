import {
  createOpenclawPublishKey,
  upsertSeedOpenclawPublisher,
} from '@/shared/models/openclaw_publisher';

const DEFAULT_OPENCLAW_ID = 'oc_local_test_publisher';
const DEFAULT_OPENCLAW_NAME = 'Local Openclaw Test Publisher';

async function seedOpenclawPublisher() {
  const openclawId =
    process.env.OPENCLAW_TEST_PUBLISHER_ID || DEFAULT_OPENCLAW_ID;
  const name =
    process.env.OPENCLAW_TEST_PUBLISHER_NAME || DEFAULT_OPENCLAW_NAME;
  const publishKey =
    process.env.OPENCLAW_TEST_PUBLISH_KEY || createOpenclawPublishKey();

  const publisher = await upsertSeedOpenclawPublisher({
    openclawId,
    name,
    publishKey,
  });

  console.log('✅ Openclaw publisher ready');
  console.log(`   openclaw_id: ${publisher.openclawId}`);
  console.log(`   name: ${publisher.name}`);
  console.log(`   status: ${publisher.status}`);
  console.log(`   publish_key: ${publisher.publishKey}`);
  console.log('');
  console.log(
    'Use this publish key in `Authorization: Bearer <api_key>` when testing Openclaw publishes.'
  );
  if (!process.env.OPENCLAW_TEST_PUBLISH_KEY) {
    console.log(
      'Running this script again without `OPENCLAW_TEST_PUBLISH_KEY` will rotate the local test key.'
    );
  }
}

seedOpenclawPublisher()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to seed Openclaw publisher');
    console.error(error);
    process.exit(1);
  });
