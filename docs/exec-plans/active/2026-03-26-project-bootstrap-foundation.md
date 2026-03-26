# Project Bootstrap Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a local-first, TDD-ready engineering foundation for this template so product work can start safely with working lint, real automated tests, a single baseline `check` command, and GitHub PR gating.

**Architecture:** Preserve the template's existing local-development flow, repair the currently broken lint baseline, add a lightweight Vitest stack in small increments, then wire the final `check` gate into GitHub PRs. Keep documentation minimal by consolidating quickstart, migration rules, and multi-agent branch rules into a single root entry file plus a PR template.

**Tech Stack:** Next.js 16, React 19, TypeScript, pnpm, ESLint 9 flat config, Vitest, vite-tsconfig-paths, GitHub Actions, Drizzle, PostgreSQL (local-first)

---

## Spec Reference

- Spec: `docs/superpowers/specs/2026-03-26-project-bootstrap-foundation-design.md`

## Working Tree Guardrails

- Do not edit `AGENTS.md` or `CLAUDE.md` in this plan; both are already dirty in the current workspace.
- Do not modify `.github/workflows/docker-build.yaml` in this phase unless the new CI workflow cannot coexist with it.
- Do not add Vercel, staging, Docker Compose, or E2E infrastructure in this plan.

## File Map

- Modify: `package.json`
  Purpose: add `test`, `test:watch`, and `check` scripts; keep existing local-development scripts intact.
- Modify: `pnpm-lock.yaml`
  Purpose: capture new dev dependencies for lint/test infrastructure.
- Create: `eslint.config.mjs`
  Purpose: restore a working ESLint 9 flat-config baseline for the existing `lint` script.
- Create: `vitest.config.ts`
  Purpose: define the first-phase Vitest runner settings and tsconfig path alias support.
- Modify: `src/shared/lib/resp.ts`
  Purpose: fix falsy payload handling exposed by the first representative test.
- Create: `src/shared/lib/resp.test.ts`
  Purpose: establish the first real test file and prove the Vitest loop works.
- Create: `src/shared/lib/rate-limit.test.ts`
  Purpose: add a second representative test around business-relevant server logic and prove alias-aware test execution.
- Create: `.github/workflows/ci.yml`
  Purpose: run the repository baseline gate on pull requests and `main`.
- Create: `.github/pull_request_template.md`
  Purpose: enforce migration/check/branch hygiene in PRs without extra process docs.
- Create: `README.md`
  Purpose: serve as the single minimal developer entry point for local startup, checks, migrations, and multi-agent collaboration rules.

## Task Order

1. Restore a working lint gate.
2. Add a minimal Vitest foundation and first TDD loop.
3. Expand the test foundation to support `@/` path aliases and a second representative test.
4. Add the canonical `check` command and wire it into GitHub CI + PR prompts.
5. Add the minimal local-first README.
6. Apply GitHub branch protection manually after the repo changes land.

### Task 1: Restore a working lint gate

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: Capture the current lint failure**

Run: `pnpm lint`

Expected: FAIL with an ESLint 9 error similar to `ESLint couldn't find an eslint.config.(js|mjs|cjs) file`.

- [ ] **Step 2: Create the flat ESLint config**

Create `eslint.config.mjs` with this content:

```js
import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
```

- [ ] **Step 3: Keep the `lint` script pointed at the whole repo**

Verify `package.json` still contains:

```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

Do not switch to a narrower target. The goal is to repair the real repository-wide lint command, not hide the problem.

- [ ] **Step 4: Re-run lint and resolve any immediately surfaced config issues**

Run: `pnpm lint`

Expected: PASS, or fail only on actionable repository violations now exposed by the working config.

If lint now reports real code issues, fix only the reported blockers needed to make the baseline command pass before moving on. Keep those fixes minimal and in the same commit as the config repair.

- [ ] **Step 5: Commit the lint repair**

Run:

```bash
git add eslint.config.mjs package.json
git commit -m "chore: restore repo lint config"
```

### Task 2: Add the first Vitest loop and fix the first exposed bug

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Create: `src/shared/lib/resp.test.ts`
- Modify: `src/shared/lib/resp.ts`
- Test: `src/shared/lib/resp.test.ts`

- [ ] **Step 1: Write the first failing test file**

Create `src/shared/lib/resp.test.ts` with this content:

```ts
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
```

- [ ] **Step 2: Run the new test to verify the current harness is missing**

Run: `pnpm test -- src/shared/lib/resp.test.ts`

Expected: FAIL with `Missing script: test`.

- [ ] **Step 3: Install Vitest and add the first test scripts**

Run:

```bash
pnpm add -D vitest
```

Modify `package.json` so the scripts section includes:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts` with this initial content:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 4: Run the targeted test again and confirm the first real behavior failure**

Run: `pnpm test -- src/shared/lib/resp.test.ts`

Expected: FAIL on `respData preserves falsy payloads instead of replacing them`, because `respData(0)` currently turns `0` into `[]`.

- [ ] **Step 5: Fix the falsy payload bug with the minimal implementation**

Update `src/shared/lib/resp.ts` to preserve `0`, `false`, and empty strings:

```ts
export function respData(data: any) {
  return respJson(0, 'ok', data ?? []);
}

export function respOk() {
  return respJson(0, 'ok');
}

export function respErr(message: string) {
  return respJson(-1, message);
}

export function respJson(code: number, message: string, data?: any) {
  const json: Record<string, any> = {
    code,
    message,
  };

  if (data !== undefined) {
    json.data = data;
  }

  return Response.json(json);
}
```

- [ ] **Step 6: Re-run the targeted test to verify the loop works**

Run: `pnpm test -- src/shared/lib/resp.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the initial test foundation**

Run:

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/shared/lib/resp.ts src/shared/lib/resp.test.ts
git commit -m "test: add initial vitest foundation"
```

### Task 3: Support `@/` imports and add a second representative test

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `vitest.config.ts`
- Create: `src/shared/lib/rate-limit.test.ts`
- Test: `src/shared/lib/rate-limit.test.ts`

- [ ] **Step 1: Write the second representative test**

Create `src/shared/lib/rate-limit.test.ts` with this content:

```ts
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
```

- [ ] **Step 2: Run the new test and confirm alias resolution is still missing**

Run: `pnpm test -- src/shared/lib/rate-limit.test.ts`

Expected: FAIL with an import-resolution error for `@/shared/lib/hash`, because `rate-limit.ts` depends on the repo's tsconfig path alias.

- [ ] **Step 3: Add tsconfig path support to the Vitest config**

Run:

```bash
pnpm add -D vite-tsconfig-paths
```

Update `vitest.config.ts` to:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

- [ ] **Step 4: Re-run the targeted test**

Run: `pnpm test -- src/shared/lib/rate-limit.test.ts`

Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`

Expected: PASS with both `resp.test.ts` and `rate-limit.test.ts`.

- [ ] **Step 6: Commit the alias-aware test expansion**

Run:

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/shared/lib/rate-limit.test.ts
git commit -m "test: cover rate-limit behavior"
```

### Task 4: Add the canonical baseline gate and GitHub PR automation

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/ci.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Prove the `check` command does not exist yet**

Run: `pnpm check`

Expected: FAIL with `Missing script: check`.

- [ ] **Step 2: Add the canonical baseline gate script**

Update `package.json` so the scripts section includes:

```json
{
  "scripts": {
    "check": "pnpm lint && pnpm format:check && pnpm test && pnpm build"
  }
}
```

- [ ] **Step 3: Verify the local gate works before wiring CI**

Run: `pnpm check`

Expected: PASS.

- [ ] **Step 4: Add the GitHub CI workflow**

Create `.github/workflows/ci.yml` with this content:

```yaml
name: CI

on:
  pull_request:
    branches: ['main']
  push:
    branches: ['main']

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Prepare CI environment
        run: |
          cp .env.example .env.development
          printf '\nAUTH_SECRET="ci-auth-secret"\n' >> .env.development

      - name: Run baseline checks
        run: pnpm check
```

- [ ] **Step 5: Add the pull request template**

Create `.github/pull_request_template.md` with this content:

```md
## Summary

- what changed:
- why:

## Verification

- [ ] `pnpm check`

## Database

- [ ] No schema change
- [ ] Schema change included with migration artifacts

## Agent Coordination

- [ ] This branch owns a bounded task
- [ ] I avoided parallel large edits to the same core files
- [ ] I synced with `main` before requesting merge
```

- [ ] **Step 6: Re-run the local gate after the CI and PR-template files land**

Run: `pnpm check`

Expected: PASS.

- [ ] **Step 7: Commit the merge gate**

Run:

```bash
git add package.json .github/workflows/ci.yml .github/pull_request_template.md
git commit -m "ci: add repository baseline gate"
```

### Task 5: Add the minimal local-first developer entry point

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the root README**

Create `README.md` with this content:

````md
# OpenTheDoor

Local-first product development setup for this repository.

## Prerequisites

- Node.js 20
- pnpm
- Local PostgreSQL

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure local environment:

   - keep local values in `.env.development`
   - use the existing local PostgreSQL connection defined there

3. Apply migrations:

   ```bash
   pnpm db:migrate
   ```

4. Start the app:

   ```bash
   pnpm dev
   ```

## Baseline quality gate

Run this before opening or updating a PR:

```bash
pnpm check
```

## TDD workflow

- write or update a failing test first
- make the minimal code change to pass it
- re-run the targeted test
- re-run `pnpm check` before merge

## Database rule

If you change schema:

1. update the schema source
2. generate migration artifacts
3. apply the migration locally
4. commit schema changes and migration files together

Default commands:

```bash
pnpm db:generate
pnpm db:migrate
```

## Branch and PR flow

- do not push feature work directly to `main`
- create a branch per task
- open a PR
- wait for CI to pass
- merge to `main`

## Multi-agent guardrails

- keep each agent on one bounded task
- avoid parallel large edits to the same core files
- prefer single-threaded changes for schema, auth, and core config
- `worktree` is optional, not required
````

- [ ] **Step 2: Verify the README commands match real scripts**

Run:

```bash
pnpm test
pnpm check
```

Expected: PASS.

- [ ] **Step 3: Commit the developer entry point**

Run:

```bash
git add README.md
git commit -m "docs: add local development quickstart"
```

### Task 6: Apply GitHub `main` protection manually

**Files:**
- No repository file changes; this task happens in GitHub repository settings.

- [ ] **Step 1: Open the repository branch protection settings**

Path: `GitHub -> Settings -> Branches -> Add branch protection rule`

- [ ] **Step 2: Add a rule for `main`**

Enable:

- Require a pull request before merging
- Require status checks to pass before merging

- [ ] **Step 3: Require the CI job**

Select the `check` status from the new `CI` workflow.

- [ ] **Step 4: Prevent direct pushes where practical**

Enable the closest available option to block direct pushes to `main` for normal work.

- [ ] **Step 5: Verify the workflow from a throwaway branch**

Expected:

- PR shows the `CI / check` status
- merge is blocked until the status is green

## Final Verification

- [ ] Run `pnpm lint`
- [ ] Run `pnpm format:check`
- [ ] Run `pnpm test`
- [ ] Run `pnpm build`
- [ ] Run `pnpm check`
- [ ] Confirm `.github/workflows/ci.yml` triggers on a PR to `main`
- [ ] Confirm README commands match the final scripts

## Completion Notes

- The implementation intentionally does **not** add Vercel, staging, Docker Compose, or E2E test infrastructure.
- If `pnpm lint` surfaces existing template violations after `eslint.config.mjs` lands, fix only the minimum blocking set required to restore a passing repository baseline.
- If `pnpm build` requires extra CI-only environment values, add them inside `.github/workflows/ci.yml` rather than expanding the local-first scope.
