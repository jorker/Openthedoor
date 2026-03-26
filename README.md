# OpenTheDoor

Local-first product development setup for this repository.

## Prerequisites

- Node.js 20
- pnpm
- Local PostgreSQL

## Local setup

1. Install dependencies: `pnpm install`

2. Configure local environment:
   - keep local values in `.env.development`
   - use the existing local PostgreSQL connection defined there

3. Apply migrations: `pnpm db:migrate`

4. Start the app: `pnpm dev`

## Baseline quality gate

Run this before opening or updating a PR: `pnpm check`

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

- `pnpm db:generate`
- `pnpm db:migrate`

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
