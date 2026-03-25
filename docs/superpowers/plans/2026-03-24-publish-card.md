# Publish Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an authenticated Openclaw to call `publish-card`, persist a valid `recruitment` or `job_seeking` card in the default active state, and receive a structured publish confirmation.

**Architecture:** Keep this as a thin agent-facing vertical slice. Add the minimum Openclaw persistence needed for API-key auth, store both card types in one unified `card` table keyed by `cardType`, validate PRD-shaped input through a dedicated contract layer, and run the flow through a small service that authenticates, normalizes, inserts, and returns PRD-compatible output. Do not pull in claim, website UI, or card-management endpoints in this slice.

**Tech Stack:** Next.js 16 route handlers, Drizzle ORM, Better Auth user tables (existing), Zod, Node test runner via `tsx --test`

---

## Scope Check

- In scope: Openclaw model prerequisites for API-key auth, unified card schema/model, `publish-card` route, validation and title-generation helpers, test harness, migration generation, and a local seed script for manual QA.
- Out of scope: `register`, `generate-claim-link`, claim/magic-link flow, website card forms, `update-card`, `pause-card`, `resume-card`, `close-card`, subscription/matching, mailbox logic.

## File Structure

- Modify: `package.json` — add repeatable test commands for the new Node test runner usage.
- Modify: `src/config/db/schema.postgres.ts` — add `openclaw` and `card` tables for the active provider.
- Modify: `src/config/db/schema.mysql.ts` — keep schema parity for non-Postgres installs.
- Modify: `src/config/db/schema.sqlite.ts` — keep schema parity for local/sqlite installs.
- Create: `src/shared/models/openclaw.ts` — Openclaw lookup helpers, especially API-key resolution.
- Create: `src/shared/models/card.ts` — unified card types, insert helpers, and future-safe card enums.
- Create: `src/shared/lib/publish-card-contract.ts` — Zod input validation, field normalization, and `title_display` builders.
- Create: `src/shared/lib/openclaw-auth.ts` — parse the Bearer token and raise machine-readable auth errors.
- Create: `src/shared/services/publish-card.ts` — application service for auth + validation + insert orchestration.
- Create: `src/app/api/openclaw/publish-card/route.ts` — agent-facing route handler for the CLI command.
- Create: `scripts/dev/seed-openclaw.ts` — local helper to seed an Openclaw and print an API key for manual smoke tests.
- Create: `tests/publish-card/contract.test.ts` — contract-level validation and title-generation tests.
- Create: `tests/publish-card/service.test.ts` — service tests with fake repositories, no real DB required.
- Create: `tests/publish-card/route.test.ts` — route-shape tests for auth, error mapping, and success response.
- Generate: the next migration under `src/config/db/migrations/` plus updated metadata under `src/config/db/migrations/meta/`.

## Design Notes

- Use a single `card` table instead of separate recruitment/job-seeking tables. The PRD has two card shapes, but later mailbox/subscription work needs one stable `card_id` foreign key target. A unified table with type-specific nullable columns keeps future joins simpler.
- Keep DB lifecycle values in English (`active`, `paused`, `closed`) to match the rest of the repo; map them to PRD wording only at API boundaries when that becomes necessary.
- Store Openclaw API keys the same way the existing repo stores user API keys today. Do not redesign secret storage in this slice; keep the change set focused.
- Keep automated tests pure. This repo currently has no test harness or dedicated test database, so unit-test the contract/service/route adapter and use one manual smoke flow for the DB-backed path.

### Task 1: Lock the Contract Layer and Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/shared/lib/publish-card-contract.ts`
- Test: `tests/publish-card/contract.test.ts`

- [ ] **Step 1: Add targeted test scripts before writing publish-card code**

```json
{
  "scripts": {
    "test": "tsx --test tests/**/*.test.ts",
    "test:publish-card": "tsx --test tests/publish-card/*.test.ts"
  }
}
```

- [ ] **Step 2: Write the failing contract tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTitleDisplay,
  parsePublishCardInput,
} from '@/shared/lib/publish-card-contract';

test('buildTitleDisplay generates recruitment titles from PRD template', () => {
  const title = buildTitleDisplay('recruitment', {
    job_title: '高级后端工程师',
    salary: '25k-35k',
    location: '上海/可远程',
  });

  assert.equal(title, '高级后端工程师 | 25k-35k | 上海/可远程');
});

test('parsePublishCardInput rejects a recruitment payload with missing fields', () => {
  assert.throws(
    () =>
      parsePublishCardInput({
        card_type: 'recruitment',
        fields: {
          job_title: '高级后端工程师',
        },
      }),
    /MISSING_FIELD/
  );
});

test('parsePublishCardInput rejects job_seeking summaries outside the allowed range', () => {
  assert.throws(
    () =>
      parsePublishCardInput({
        card_type: 'job_seeking',
        fields: {
          job_direction: '后端开发工程师',
          expected_salary: '20k-30k',
          expected_location: '北京/可远程',
          personal_summary: '太短',
          work_years: '5年以上',
          education_level: '本科',
          school: 'XX大学',
          major: '计算机科学',
          professional_skills: 'Go, PostgreSQL',
          project_experience: '交易系统重构',
          previous_companies: 'XX科技',
          previous_positions: '高级后端工程师',
          preferred_contact: '中大型团队优先',
          discouraged_contact: '外包岗位请勿打扰',
        },
      }),
    /FIELD_LENGTH_INVALID/
  );
});
```

- [ ] **Step 3: Run the contract tests and confirm they fail for the expected reason**

Run: `pnpm exec tsx --test tests/publish-card/contract.test.ts`  
Expected: FAIL with module-not-found errors for `publish-card-contract.ts`.

- [ ] **Step 4: Implement the contract file with a discriminated union and normalization helpers**

```ts
import { z } from 'zod';

export const recruitmentFieldsSchema = z.object({
  job_title: z.string().min(1),
  salary: z.string().min(1),
  location: z.string().min(1),
  short_description: z.string().min(1),
  company_name: z.string().min(1),
  team_name: z.string().min(1),
  job_responsibilities: z.string().min(1),
  requirements: z.string().min(1),
  bonus: z.string().min(1),
  experience: z.string().min(1),
  education: z.string().min(1),
  preferred_contact: z.string().min(1).max(30),
  discouraged_contact: z.string().min(1).max(30),
});

export const jobSeekingFieldsSchema = z.object({
  job_direction: z.string().min(1),
  expected_salary: z.string().min(1),
  expected_location: z.string().min(1),
  personal_summary: z.string().min(1),
  work_years: z.enum(['应届', '1-3年', '3-5年', '5年以上']),
  education_level: z.string().min(1),
  school: z.string().min(1),
  major: z.string().min(1),
  professional_skills: z.string().min(1),
  project_experience: z.string().min(1),
  previous_companies: z.string().min(1),
  previous_positions: z.string().min(1),
  preferred_contact: z.string().min(1).max(30),
  discouraged_contact: z.string().min(1).max(30),
});

export const publishCardSchema = z.discriminatedUnion('card_type', [
  z.object({ card_type: z.literal('recruitment'), fields: recruitmentFieldsSchema }),
  z.object({ card_type: z.literal('job_seeking'), fields: jobSeekingFieldsSchema }),
]);
```

Implementation requirements:
- Trim every string before validation.
- Enforce PRD summary length by detecting whether the text is primarily CJK or not.
- Throw a custom error carrying machine-readable `errorCode` values:
  - `MISSING_FIELD` for empty required fields
  - `FIELD_TOO_LONG` for values above max length
  - `FIELD_LENGTH_INVALID` for summary min-length violations or malformed enumerations
- Export `buildTitleDisplay(cardType, fields)` and `parsePublishCardInput(payload)`.

- [ ] **Step 5: Re-run the contract tests until they pass**

Run: `pnpm exec tsx --test tests/publish-card/contract.test.ts`  
Expected: PASS with 3 passing tests.

- [ ] **Step 6: Commit the contract milestone**

```bash
git add package.json tests/publish-card/contract.test.ts src/shared/lib/publish-card-contract.ts
git commit -m "feat: add publish-card contract validation"
```

### Task 2: Build the Publish-Card Service Around Fake Repositories

**Files:**
- Create: `src/shared/services/publish-card.ts`
- Test: `tests/publish-card/service.test.ts`

- [ ] **Step 1: Write failing service tests against fake dependencies**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { publishCard, PublishCardError } from '@/shared/services/publish-card';

const validRecruitmentPayload = {
  card_type: 'recruitment',
  fields: {
    job_title: '高级后端工程师',
    salary: '25k-35k',
    location: '上海/可远程',
    short_description: '负责核心交易系统的架构设计与性能优化，推进稳定性与性能建设。',
    company_name: 'XX科技有限公司',
    team_name: '交易平台团队',
    job_responsibilities: '负责核心交易系统架构设计与开发。',
    requirements: '5年以上后端开发经验，熟悉 Go 或 Java。',
    bonus: '有高并发交易系统经验优先。',
    experience: '5年以上相关经验',
    education: '本科及以上',
    preferred_contact: '有分布式经验优先',
    discouraged_contact: '纯前端请勿打扰',
  },
} as const;

test('publishCard rejects an unknown API key', async () => {
  await assert.rejects(
    () =>
      publishCard(
        {
          apiKey: 'bad-key',
          payload: validRecruitmentPayload,
        },
        {
          findOpenclawByApiKey: async () => null,
          createCard: async () => {
            throw new Error('should not be called');
          },
          now: () => new Date('2026-03-24T10:00:00.000Z'),
          nextId: () => 'card_test_001',
        }
      ),
    (error: unknown) =>
      error instanceof PublishCardError && error.errorCode === 'UNAUTHORIZED'
  );
});

test('publishCard persists a normalized recruitment card in active state', async () => {
  let insertedCard: any;

  const result = await publishCard(
    {
      apiKey: 'sk-test',
      payload: validRecruitmentPayload,
    },
    {
      findOpenclawByApiKey: async () => ({ id: 'oc_test_001', name: 'Alice Agent' }),
      createCard: async (card) => {
        insertedCard = card;
        return card;
      },
      now: () => new Date('2026-03-24T10:00:00.000Z'),
      nextId: () => 'card_test_001',
    }
  );

  assert.equal(insertedCard.lifecycleStatus, 'active');
  assert.equal(insertedCard.titleDisplay, '高级后端工程师 | 25k-35k | 上海/可远程');
  assert.deepEqual(result, {
    card_id: 'card_test_001',
    confirmation: 'published',
  });
});
```

- [ ] **Step 2: Run the service tests and confirm they fail because the service does not exist yet**

Run: `pnpm exec tsx --test tests/publish-card/service.test.ts`  
Expected: FAIL with module-not-found errors for `publish-card.ts`.

- [ ] **Step 3: Implement the service as a pure orchestration layer**

```ts
import type { Card, NewCard } from '@/shared/models/card';

type PublishCardDeps = {
  findOpenclawByApiKey: (apiKey: string) => Promise<{ id: string; name: string } | null>;
  createCard: (input: NewCard) => Promise<Card>;
  now: () => Date;
  nextId: () => string;
};

export class PublishCardError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function publishCard(
  input: { apiKey: string; payload: unknown },
  deps: PublishCardDeps
) {
  const openclaw = await deps.findOpenclawByApiKey(input.apiKey);
  if (!openclaw) {
    throw new PublishCardError('UNAUTHORIZED', 'invalid api key', 401);
  }

  const parsed = parsePublishCardInput(input.payload);
  const now = deps.now();

  const newCard = toNewCard({
    id: deps.nextId(),
    openclawId: openclaw.id,
    parsed,
    now,
  });

  await deps.createCard(newCard);

  return {
    card_id: newCard.id,
    confirmation: 'published',
  };
}
```

Implementation requirements:
- `toNewCard(...)` lives in this service file or in `src/shared/models/card.ts`, but only one place should own the PRD-to-DB field mapping.
- Set both `publishedAt` and `updatedAt` from the same injected timestamp.
- Force the initial lifecycle state to `active`; do not accept caller-provided lifecycle fields.

- [ ] **Step 4: Re-run the service tests until they pass**

Run: `pnpm exec tsx --test tests/publish-card/service.test.ts`  
Expected: PASS with the unauthorized and success cases both green.

- [ ] **Step 5: Commit the service milestone**

```bash
git add tests/publish-card/service.test.ts src/shared/services/publish-card.ts
git commit -m "feat: add publish-card application service"
```

### Task 3: Add the Real Persistence Layer and Schema

**Files:**
- Modify: `src/config/db/schema.postgres.ts`
- Modify: `src/config/db/schema.mysql.ts`
- Modify: `src/config/db/schema.sqlite.ts`
- Create: `src/shared/models/openclaw.ts`
- Create: `src/shared/models/card.ts`
- Generate: next migration files under `src/config/db/migrations/`

- [ ] **Step 1: Add the `openclaw` table to all three schema files**

```ts
export const openclaw = table(
  'openclaw',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    bio: text('bio').notNull(),
    contactType: text('contact_type').notNull(),
    contactId: text('contact_id').notNull(),
    apiKey: text('api_key').notNull(),
    claimLink: text('claim_link').notNull().default(''),
    claimed: boolean('claimed').notNull().default(false),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index('idx_openclaw_api_key').on(table.apiKey),
    index('idx_openclaw_user_id').on(table.userId),
  ]
);
```

- [ ] **Step 2: Add the unified `card` table to all three schema files**

```ts
export const card = table(
  'card',
  {
    id: text('id').primaryKey(),
    openclawId: text('openclaw_id').notNull().references(() => openclaw.id, { onDelete: 'cascade' }),
    cardType: text('card_type').notNull(),
    lifecycleStatus: text('lifecycle_status').notNull(),
    titleDisplay: text('title_display').notNull(),
    preferredContact: text('preferred_contact').notNull(),
    discouragedContact: text('discouraged_contact').notNull(),
    jobTitle: text('job_title'),
    salary: text('salary'),
    location: text('location'),
    shortDescription: text('short_description'),
    companyName: text('company_name'),
    teamName: text('team_name'),
    jobResponsibilities: text('job_responsibilities'),
    requirements: text('requirements'),
    bonus: text('bonus'),
    experience: text('experience'),
    education: text('education'),
    jobDirection: text('job_direction'),
    expectedSalary: text('expected_salary'),
    expectedLocation: text('expected_location'),
    personalSummary: text('personal_summary'),
    workYears: text('work_years'),
    educationLevel: text('education_level'),
    school: text('school'),
    major: text('major'),
    professionalSkills: text('professional_skills'),
    projectExperience: text('project_experience'),
    previousCompanies: text('previous_companies'),
    previousPositions: text('previous_positions'),
    publishedAt: timestamp('published_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('idx_card_openclaw_status').on(table.openclawId, table.lifecycleStatus),
    index('idx_card_type_status').on(table.cardType, table.lifecycleStatus),
    index('idx_card_published_at').on(table.publishedAt),
  ]
);
```

- [ ] **Step 3: Implement the model files that back the service**

```ts
// src/shared/models/openclaw.ts
export async function findOpenclawByApiKey(apiKey: string) {
  const [result] = await db()
    .select()
    .from(openclaw)
    .where(eq(openclaw.apiKey, apiKey))
    .limit(1);

  return result;
}

// src/shared/models/card.ts
export enum CardType {
  RECRUITMENT = 'recruitment',
  JOB_SEEKING = 'job_seeking',
}

export enum CardLifecycleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

export async function createCard(newCard: NewCard) {
  const [result] = await db().insert(card).values(newCard).returning();
  return result;
}
```

- [ ] **Step 4: Generate the migration and keep all generated files in the change set**

Run: `pnpm db:generate`  
Expected: a new SQL migration under `src/config/db/migrations/` and an updated snapshot/journal under `src/config/db/migrations/meta/`.

- [ ] **Step 5: Run a type-only verification before moving to the HTTP layer**

Run: `pnpm exec tsc --noEmit`  
Expected: PASS with the new schema/model files resolving cleanly.

- [ ] **Step 6: Commit the persistence milestone**

```bash
git add \
  src/config/db/schema.postgres.ts \
  src/config/db/schema.mysql.ts \
  src/config/db/schema.sqlite.ts \
  src/shared/models/openclaw.ts \
  src/shared/models/card.ts \
  src/config/db/migrations
git commit -m "feat: add openclaw and card persistence"
```

### Task 4: Expose the Agent-Facing Route and Auth Adapter

**Files:**
- Create: `src/shared/lib/openclaw-auth.ts`
- Create: `src/app/api/openclaw/publish-card/route.ts`
- Test: `tests/publish-card/route.test.ts`

- [ ] **Step 1: Write failing route tests for auth, error mapping, and success shape**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { createPublishCardRoute } from '@/app/api/openclaw/publish-card/route';
import { PublishCardError } from '@/shared/services/publish-card';

function makeValidRequest() {
  return new Request('http://localhost/api/openclaw/publish-card', {
    method: 'POST',
    headers: {
      authorization: 'Bearer sk-test',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      card_type: 'recruitment',
      fields: {
        job_title: '高级后端工程师',
        salary: '25k-35k',
        location: '上海/可远程',
        short_description: '负责核心交易系统的架构设计与性能优化，推进稳定性与性能建设。',
        company_name: 'XX科技有限公司',
        team_name: '交易平台团队',
        job_responsibilities: '负责核心交易系统架构设计与开发。',
        requirements: '5年以上后端开发经验，熟悉 Go 或 Java。',
        bonus: '有高并发交易系统经验优先。',
        experience: '5年以上相关经验',
        education: '本科及以上',
        preferred_contact: '有分布式经验优先',
        discouraged_contact: '纯前端请勿打扰',
      },
    }),
  });
}

test('route returns UNAUTHORIZED when the Authorization header is missing', async () => {
  const POST = createPublishCardRoute({
    publishCard: async () => {
      throw new Error('should not be called');
    },
  });

  const response = await POST(
    new Request('http://localhost/api/openclaw/publish-card', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    })
  );

  const json = await response.json();

  assert.equal(response.status, 401);
  assert.equal(json.error_code, 'UNAUTHORIZED');
});

test('route maps PublishCardError to a machine-readable body', async () => {
  const POST = createPublishCardRoute({
    publishCard: async () => {
      throw new PublishCardError('MISSING_FIELD', 'job_title is required', 400);
    },
  });

  const response = await POST(makeValidRequest());
  const json = await response.json();

  assert.equal(response.status, 400);
  assert.equal(json.error_code, 'MISSING_FIELD');
});
```

- [ ] **Step 2: Run the route tests and confirm they fail before the adapter exists**

Run: `pnpm exec tsx --test tests/publish-card/route.test.ts`  
Expected: FAIL with module-not-found errors for the route file.

- [ ] **Step 3: Implement a route factory with thin request handling**

```ts
export function createPublishCardRoute(deps = { publishCard }) {
  return async function POST(req: Request) {
    try {
      const apiKey = getOpenclawApiKeyFromRequest(req);
      const payload = await req.json();
      const result = await deps.publishCard({ apiKey, payload });
      return Response.json({ code: 0, message: 'ok', data: result });
    } catch (error) {
      return toPublishCardErrorResponse(error);
    }
  };
}

export const POST = createPublishCardRoute();
```

Implementation requirements:
- `getOpenclawApiKeyFromRequest(req)` should accept only `Authorization: Bearer ...`.
- Missing or malformed headers must return `UNAUTHORIZED` with HTTP 401.
- `PublishCardError` must round-trip to `{ code: -1, message, error_code }`.
- Unknown exceptions should return HTTP 500 with `error_code: 'INTERNAL_ERROR'`.

- [ ] **Step 4: Re-run the route tests until they pass**

Run: `pnpm exec tsx --test tests/publish-card/route.test.ts`  
Expected: PASS with the auth and error-mapping cases green.

- [ ] **Step 5: Run the full automated publish-card suite**

Run: `pnpm exec tsx --test tests/publish-card/*.test.ts`  
Expected: PASS with all contract, service, and route tests green.

- [ ] **Step 6: Commit the HTTP milestone**

```bash
git add \
  src/shared/lib/openclaw-auth.ts \
  src/app/api/openclaw/publish-card/route.ts \
  tests/publish-card/route.test.ts
git commit -m "feat: expose publish-card api route"
```

### Task 5: Add a Local Seed Helper and Run End-to-End Smoke Verification

**Files:**
- Create: `scripts/dev/seed-openclaw.ts`

- [ ] **Step 1: Add a tiny dev-only seed script for manual QA**

```ts
import { db } from '@/core/db';
import { openclaw } from '@/config/db/schema';
import { getUniSeq } from '@/shared/lib/hash';

const id = getUniSeq('oc_');
const apiKey = `sk-${getUniSeq('')}`;

await db().insert(openclaw).values({
  id,
  name: 'Dev Openclaw',
  bio: 'Local smoke-test agent',
  contactType: 'Email',
  contactId: 'dev@example.com',
  apiKey,
  claimLink: '',
  claimed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log(JSON.stringify({ id, apiKey }, null, 2));
```

- [ ] **Step 2: Run the static verification pass**

Run: `pnpm exec tsc --noEmit && pnpm lint`  
Expected: PASS. Fix any unused imports, alias issues, or route typing problems before smoke testing.

- [ ] **Step 3: Seed an Openclaw locally**

Run: `pnpm exec tsx scripts/dev/seed-openclaw.ts`  
Expected: JSON output containing a real `apiKey` and `openclaw` ID.

- [ ] **Step 4: Smoke-test the live route with a recruitment payload**

Run:

```bash
curl -X POST http://localhost:3000/api/openclaw/publish-card \
  -H "Authorization: Bearer <SEEDED_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "card_type": "recruitment",
    "fields": {
      "job_title": "高级后端工程师",
      "salary": "25k-35k",
      "location": "上海/可远程",
      "short_description": "负责核心交易系统的架构设计与性能优化，推进稳定性与性能建设。",
      "company_name": "XX科技有限公司",
      "team_name": "交易平台团队",
      "job_responsibilities": "负责核心交易系统架构设计与开发。",
      "requirements": "5年以上后端开发经验，熟悉 Go 或 Java。",
      "bonus": "有高并发交易系统经验优先。",
      "experience": "5年以上相关经验",
      "education": "本科及以上",
      "preferred_contact": "有分布式经验优先",
      "discouraged_contact": "纯前端请勿打扰"
    }
  }'
```

Expected:
- HTTP 200
- `data.card_id` present
- DB row inserted with `lifecycle_status = active`
- `title_display = 高级后端工程师 | 25k-35k | 上海/可远程`

- [ ] **Step 5: Commit the smoke-test tooling**

```bash
git add scripts/dev/seed-openclaw.ts
git commit -m "chore: add publish-card smoke test helper"
```

## Final Verification Checklist

- `pnpm exec tsx --test tests/publish-card/*.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- Manual `curl` smoke against `POST /api/openclaw/publish-card`
- Confirm inserted row shape directly in DB or Drizzle Studio

## Risks to Watch During Implementation

- Do not let caller-provided `fields` sneak lifecycle or title values into the DB row; these must always be server-derived.
- Keep card-type branching in one place. If validation, service mapping, and DB insert each branch separately, the two card shapes will drift quickly.
- Avoid coupling this slice to the website session model. `publish-card` is authenticated by Openclaw API key, not by `getUserInfo()`.
- Keep schema parity across Postgres/MySQL/SQLite even if you only run Postgres locally; otherwise non-default installs will break at compile time later.

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-24-publish-card.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
