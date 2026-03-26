# Project Bootstrap Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a local-first, TDD-ready engineering foundation for this template so product work can start safely with working lint, real automated tests, a single baseline `check` command, and GitHub PR gating.

**Architecture:** Preserve the template's existing local-development flow, repair the currently broken lint baseline, add a lightweight Vitest stack in small increments, then wire the final `check` gate into GitHub PRs. Keep documentation minimal by consolidating quickstart, migration rules, and multi-agent branch rules into a single root entry file plus a PR template.

**Tech Stack:** Next.js 16, React 19, TypeScript, pnpm, ESLint 9 flat config, Vitest, vite-tsconfig-paths, GitHub Actions, Drizzle, PostgreSQL (local-first)

---

## Spec Reference

- Spec: `docs/superpowers/specs/2026-03-26-project-bootstrap-foundation-design.md`

## Working Tree Guardrails

- Do not edit `AGENTS.md` or `CLAUDE.md` in this plan.
- Do not modify `.github/workflows/docker-build.yaml` in this phase unless the new CI workflow cannot coexist with it.
- Do not add Vercel, staging, Docker Compose, or E2E infrastructure in this plan.

## Execution Status

**Current branch:** `codex/project-bootstrap-foundation`

**Current worktree:** `/Users/yuanheng/Documents/dev/Openthedoor/.worktrees/project-bootstrap-foundation`

**Current verification state:**

- `pnpm lint`: PASS
  Note: prints two third-party `baseline-browser-mapping` update notices, but exits `0`
- `pnpm test`: PASS
  Current result: `2 files / 5 tests`
- `pnpm check`: FAIL
  Current result: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "check" not found`

**Completed tasks:**

- [x] Task 1: Restore a working lint gate
      Commits: `fa15282`, `82f2447`
- [x] Task 2: Add the first Vitest loop and fix the first exposed bug
      Commit: `996a367`
- [x] Task 3: Support `@/` imports and add a second representative test
      Commit: `b0218ba`

**In-progress task:**

- [ ] Task 4: Add the canonical baseline gate and GitHub PR automation

## Execution Notes

- The original plan file existed only in the primary workspace. This copy is the synchronized execution copy inside the active worktree.
- Task 1 plan text used a `FlatCompat` snippet. In the current dependency set, that snippet failed with a circular-structure error. The final implementation preserves `eslint-config-next/core-web-vitals` as the base and narrows only an explicit allowlist of noisy rules.
- Task 3 uncovered a CLI nuance: under the current `pnpm` + `vitest` combination, `pnpm test -- src/shared/lib/rate-limit.test.ts` expands to `vitest run -- src/shared/lib/rate-limit.test.ts`, which does not strictly filter to a single file in Vitest `4.1.1`. For exact single-file verification, use:

```bash
pnpm exec vitest run src/shared/lib/rate-limit.test.ts
```

- The same nuance also applies to `resp.test.ts`. For exact single-file verification, use:

```bash
pnpm exec vitest run src/shared/lib/resp.test.ts
```

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

- [x] Step 1: Capture the current lint failure
- [x] Step 2: Create the flat ESLint config
- [x] Step 3: Keep the `lint` script pointed at the whole repo
- [x] Step 4: Re-run lint and resolve the minimum blocking set
- [x] Step 5: Commit the lint repair

**Executed result summary:**

- Final lint base is `eslint-config-next/core-web-vitals`
- Explicit noisy-rule allowlist was disabled to keep lint runtime-focused
- Real `react-hooks/rules-of-hooks` violations were fixed in:
  - `src/shared/blocks/common/locale-detector.tsx`
  - `src/shared/blocks/payment/payment-providers.tsx`
  - `src/shared/blocks/table/time.tsx`
- Stale `eslint-disable` comments were removed from:
  - `src/shared/blocks/common/top-banner.tsx`
  - `src/shared/blocks/sign/sign-user.tsx`
  - `src/shared/lib/rate-limit.ts`
  - `src/shared/types/blocks/landing.d.ts`

### Task 2: Add the first Vitest loop and fix the first exposed bug

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Create: `src/shared/lib/resp.test.ts`
- Modify: `src/shared/lib/resp.ts`

- [x] Step 1: Write the first failing test file
- [x] Step 2: Verify the current harness is missing
- [x] Step 3: Install Vitest and add the first test scripts
- [x] Step 4: Re-run the targeted test and confirm the first real behavior failure
- [x] Step 5: Fix the falsy payload bug with the minimal implementation
- [x] Step 6: Re-run the targeted test to verify the loop works
- [x] Step 7: Commit the initial test foundation

**Executed result summary:**

- Added `test` and `test:watch` scripts
- Added minimal `vitest.config.ts`
- Added `src/shared/lib/resp.test.ts`
- Fixed `src/shared/lib/resp.ts` so falsy payloads like `0` are preserved and `data` is omitted only when `undefined`

### Task 3: Support `@/` imports and add a second representative test

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `vitest.config.ts`
- Create: `src/shared/lib/rate-limit.test.ts`

- [x] Step 1: Write the second representative test
- [x] Step 2: Run the new test and confirm alias resolution is still missing
- [x] Step 3: Add tsconfig path support to the Vitest config
- [x] Step 4: Re-run the targeted test
- [x] Step 5: Run the full test suite
- [x] Step 6: Commit the alias-aware test expansion

**Executed result summary:**

- Added `vite-tsconfig-paths`
- Updated `vitest.config.ts` to load tsconfig path aliases
- Added `src/shared/lib/rate-limit.test.ts`
- Verified full suite passes

### Task 4: Add the canonical baseline gate and GitHub PR automation

**Files:**

- Modify: `package.json`
- Create: `.github/workflows/ci.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Prove the `check` command does not exist yet**

Run: `pnpm check`

Expected: FAIL with `Missing script: check`.

**Current execution note:** this currently fails with pnpm's modern wording:

```text
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "check" not found
```

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
