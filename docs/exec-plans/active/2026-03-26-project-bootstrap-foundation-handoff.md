# Project Bootstrap Foundation Handoff

## Workspace

- Repository: `/Users/yuanheng/Documents/dev/Openthedoor`
- Active worktree: `/Users/yuanheng/Documents/dev/Openthedoor/.worktrees/project-bootstrap-foundation`
- Active branch: `codex/project-bootstrap-foundation`
- Worktree status at handoff time: clean

## Read These First

1. `docs/exec-plans/active/2026-03-26-project-bootstrap-foundation.md`
2. `docs/superpowers/specs/2026-03-26-project-bootstrap-foundation-design.md`
3. `package.json`
4. `eslint.config.mjs`
5. `vitest.config.ts`
6. `src/shared/lib/resp.ts`
7. `src/shared/lib/resp.test.ts`
8. `src/shared/lib/rate-limit.ts`
9. `src/shared/lib/rate-limit.test.ts`

If you only have time for one doc, start with the updated plan file. It contains the execution status and the remaining tasks.

## What Has Been Completed

### Task 1: Restore a working lint gate

Commits:

- `fa15282` `chore: restore repo lint config`
- `82f2447` `chore: finalize repo lint config`

Final outcome:

- `eslint.config.mjs` exists and `pnpm lint` passes
- lint remains repo-wide via `eslint .`
- final ESLint base is `eslint-config-next/core-web-vitals`
- noisy rules were narrowed by explicit allowlist, not by disabling all warnings
- stale `eslint-disable` comments were removed instead of hidden globally
- real `react-hooks/rules-of-hooks` violations were fixed in:
  - `src/shared/blocks/common/locale-detector.tsx`
  - `src/shared/blocks/payment/payment-providers.tsx`
  - `src/shared/blocks/table/time.tsx`

Current lint note:

- `pnpm lint` prints two `baseline-browser-mapping` update notices from third-party code, but exits `0`

### Task 2: Add the first Vitest loop and fix the first exposed bug

Commit:

- `996a367` `test: add initial vitest foundation`

Final outcome:

- added `test` and `test:watch` scripts in `package.json`
- added `vitest` as a dev dependency
- created `vitest.config.ts`
- created `src/shared/lib/resp.test.ts`
- fixed `src/shared/lib/resp.ts` so falsy payloads are preserved:
  - `respData(0)` now returns `data: 0`
  - `respJson` only includes `data` when it is not `undefined`

### Task 3: Support `@/` imports and add a second representative test

Commit:

- `b0218ba` `test: cover rate-limit behavior`

Final outcome:

- added `vite-tsconfig-paths`
- updated `vitest.config.ts` to load tsconfig aliases
- created `src/shared/lib/rate-limit.test.ts`
- full suite passes with:
  - `src/shared/lib/resp.test.ts`
  - `src/shared/lib/rate-limit.test.ts`

## Current Technical Decisions

### ESLint

The final ESLint config intentionally keeps `core-web-vitals` strictness but disables a focused set of high-noise rules that do not fit the current “runtime-focused baseline” goal.

Current disabled rule allowlist in `eslint.config.mjs`:

- `@next/next/no-assign-module-variable`
- `@next/next/no-img-element`
- `import/no-anonymous-default-export`
- `jsx-a11y/alt-text`
- `jsx-a11y/aria-props`
- `jsx-a11y/aria-proptypes`
- `jsx-a11y/aria-unsupported-elements`
- `jsx-a11y/role-has-required-aria-props`
- `jsx-a11y/role-supports-aria-props`
- `react/display-name`
- `react-hooks/exhaustive-deps`
- `react-hooks/error-boundaries`
- `react-hooks/immutability`
- `react-hooks/incompatible-library`
- `react-hooks/purity`
- `react-hooks/set-state-in-effect`
- `react-hooks/static-components`
- `react-hooks/unsupported-syntax`

Rationale:

- keep lint output quiet enough for agent use
- preserve repo-wide linting
- still keep important `core-web-vitals` protections, including `react-hooks/rules-of-hooks`

### Vitest

Current Vitest decisions:

- runner: `vitest`
- scripts:
  - `pnpm test` -> `vitest run`
  - `pnpm test:watch` -> `vitest`
- environment: `node`
- include globs:
  - `src/**/*.test.ts`
  - `src/**/*.test.tsx`
- aliases: resolved via `vite-tsconfig-paths`

## Mistakes and Pitfalls Already Hit

### 1. The original Task 1 FlatCompat snippet did not work in this dependency set

The plan originally used a `FlatCompat` snippet with `compat.extends('next/core-web-vitals', 'next/typescript')`.

In this repository state, that path failed with a circular-structure error during ESLint config loading. Do not go back to that version unless you intentionally want to re-debug the compatibility issue.

### 2. Disabling all warn-level rules was too broad

An intermediate Task 1 attempt turned every upstream `warn` into `off`. Review flagged this because it also disabled rules that still had runtime signal, such as `@next/next/no-async-client-component`.

Final fix:

- keep the upstream preset
- disable only an explicit allowlist

### 3. Switching from `core-web-vitals` to plain `eslint-config-next` was also wrong

An intermediate Task 1 attempt used plain `eslint-config-next` as the base. Review flagged this because it weakened stricter Next protections from `core-web-vitals`, including:

- `@next/next/no-html-link-for-pages`
- `@next/next/no-sync-scripts`

Final fix:

- base is again `eslint-config-next/core-web-vitals`

### 4. Globally hiding unused-disable warnings was the wrong fix

Another intermediate Task 1 attempt set `reportUnusedDisableDirectives: 'off'`. Review flagged that as maintainability debt.

Final fix:

- remove the stale `eslint-disable` comments
- keep unused-disable reporting available

### 5. Targeted Vitest command nuance

This is the most important pitfall for the next session.

The plan text uses:

```bash
pnpm test -- src/shared/lib/rate-limit.test.ts
```

Under the current `pnpm` + `vitest` setup, that expands to:

```bash
vitest run -- src/shared/lib/rate-limit.test.ts
```

In Vitest `4.1.1`, that form does not strictly filter to a single file. It may run more than one test file.

Evidence already verified:

- `pnpm exec vitest run src/shared/lib/rate-limit.test.ts --reporter=verbose`
  - runs `1 file / 2 tests`
- `pnpm exec vitest run -- src/shared/lib/rate-limit.test.ts --reporter=verbose`
  - runs `2 files / 5 tests`

Use this instead whenever you need exact single-file proof:

```bash
pnpm exec vitest run src/shared/lib/rate-limit.test.ts
pnpm exec vitest run src/shared/lib/resp.test.ts
```

This is a tooling behavior nuance, not a product bug.

## Verification State At Handoff

Freshly verified:

- `pnpm lint`: PASS
- `pnpm test`: PASS
  - current output: `2 files / 5 tests`
- `pnpm check`: FAIL
  - current output: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "check" not found`
- `pnpm exec eslint . --report-unused-disable-directives`: PASS

## What Still Needs To Be Done

### Next task is Task 4

Start exactly here:

1. Add `check` to `package.json`
   - `pnpm lint && pnpm format:check && pnpm test && pnpm build`
2. Verify `pnpm check`
3. Add `.github/workflows/ci.yml`
4. Add `.github/pull_request_template.md`
5. Re-run `pnpm check`
6. Commit Task 4

### Then Task 5

1. Create root `README.md`
2. Verify `pnpm test`
3. Verify `pnpm check`
4. Commit Task 5

### Then Task 6

This is manual GitHub branch protection work, not a repository file change.

## Recommended Restart Procedure For The New Session

1. Open the worktree:
   `/Users/yuanheng/Documents/dev/Openthedoor/.worktrees/project-bootstrap-foundation`
2. Read:
   - `docs/exec-plans/active/2026-03-26-project-bootstrap-foundation.md`
   - `docs/exec-plans/active/2026-03-26-project-bootstrap-foundation-handoff.md`
   - `docs/superpowers/specs/2026-03-26-project-bootstrap-foundation-design.md`
3. Confirm branch and status:
   - `git status --short --branch`
4. Resume from Task 4 Step 1
5. If using targeted Vitest verification, use `pnpm exec vitest run <file>` instead of `pnpm test -- <file>`

## Do Not Re-Do

- Do not revisit ESLint architecture unless Task 4 or later truly forces it
- Do not re-introduce `FlatCompat` for Task 1
- Do not broaden lint scope by re-enabling all warnings
- Do not modify `AGENTS.md` or `CLAUDE.md`
- Do not expand into Vercel, staging, Docker, or E2E work
