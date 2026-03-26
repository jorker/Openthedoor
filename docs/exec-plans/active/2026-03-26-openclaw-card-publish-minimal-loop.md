# Openclaw Card Publish Minimal Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest real Openclaw-to-backend publish loop for `job_seeking` and `recruitment` cards, using a dedicated Openclaw publish identity, strict envelope validation, and minimal metadata plus `payload_json` storage.

**Architecture:** Keep the first slice narrow. A real Openclaw submits a flexible JSON payload through one publish endpoint. The backend authenticates an Openclaw-owned publish key, validates only the envelope and forbidden fields, generates server-owned metadata, and stores the payload without semantic business-field validation. Do not pull in user onboarding, platform-side upload, heartbeat, subscription matching, or update-card behavior.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle ORM, PostgreSQL-first schema flow, existing `resp` response helpers, existing scripts and migration workflow

---

## Plan Guardrails

- This plan is intentionally module-level, not file-by-file code scaffolding.
- Do not write concrete code or pseudocode from this plan.
- Do not invent framework APIs, helper functions, or file paths before checking the current repository implementation.
- Only name exact file paths when they already exist in the repository or when the module boundary is already explicit in the approved design.
- Treat unresolved repository questions as investigation tasks, not assumptions.
- Record every meaningful implementation decision and every failed approach in the `Technical Decision Log` section before moving on.
- If execution reveals that this work depends on unfinished bootstrap-foundation tasks, pause and finish only the minimum prerequisite subset instead of silently widening this plan.

## Spec Reference

- Spec: `docs/superpowers/specs/2026-03-26-openclaw-card-publish-minimal-loop-design.md`
- Related tech debt tracker: `docs/exec-plans/tech-debt-tracker.md`
- Related prerequisite plan: `docs/exec-plans/active/2026-03-26-project-bootstrap-foundation.md`

## Scope

In scope:

- dedicated Openclaw publish identity separate from user auth
- dedicated Openclaw publish key separate from user API keys
- minimal `card` persistence with metadata plus `payload_json`
- single publish endpoint for `job_seeking` and `recruitment`
- strict envelope validation
- structured validation errors with actionable guidance
- minimal seed path for one test publisher and one publish key
- minimal Openclaw-facing publish contract document

Out of scope:

- `register`, `claim`, or binding flows
- platform-side file upload or document parsing
- semantic validation inside `payload`
- search, subscription matching, notification delivery, or heartbeat
- card update paths
- user-facing publish UI

## Preconditions

Execution should not start until these conditions are true or explicitly addressed:

- The repository's migration path is working for the current local environment.
- There is an agreed way to verify backend behavior locally.
  - Preferred: the bootstrap-foundation plan has already established a real backend test path.
  - If not, the implementer must explicitly decide the minimum temporary verification strategy before feature work begins.
- The implementation owner has checked current schema maintenance expectations.
  - Decide whether this feature must keep `schema.postgres.ts`, `schema.mysql.ts`, and `schema.sqlite.ts` aligned, or whether the project is explicitly PostgreSQL-only for this slice.
- The implementation owner has checked the current response-helper behavior.
  - `src/shared/lib/resp.ts` currently has falsy-value behavior that may be incompatible with structured error payloads.
  - Decide whether to fix that helper first or isolate this feature's responses from it.

## Confirmed Module Boundaries

Existing boundaries already present in the repository:

- Database schema export: `src/config/db/schema.ts`
- Database schema definitions: `src/config/db/schema.postgres.ts`, `src/config/db/schema.mysql.ts`, `src/config/db/schema.sqlite.ts`
- Database migrations: `src/config/db/migrations/`
- Shared domain model boundary: `src/shared/models/`
- Shared response helpers: `src/shared/lib/resp.ts`
- API route boundary: `src/app/api/`
- Existing scripts boundary: `scripts/`

New feature boundaries expected from this plan:

- Openclaw publisher persistence module under `src/shared/models/`
- Card persistence module under `src/shared/models/`
- Publish validation and error-mapping module near existing shared server utilities
- Publish route under `src/app/api/openclaw/cards/publish/`
- Seed entry point under `scripts/`
- Openclaw-facing publish contract doc under `docs/product-specs/`

## Task Breakdown

### Task 1: Prerequisite Gate and Repository Boundary Check

**Modules:**

- Existing planning and engineering-gate docs
- Existing DB schema and migration boundaries
- Existing response-helper and route patterns

**Confirmed files to inspect:**

- `package.json`
- `docs/exec-plans/active/2026-03-26-project-bootstrap-foundation.md`
- `src/config/db/schema.ts`
- `src/config/db/schema.postgres.ts`
- `src/config/db/schema.mysql.ts`
- `src/config/db/schema.sqlite.ts`
- `src/shared/lib/resp.ts`
- one existing authenticated API route under `src/app/api/`

- [ ] Confirm the minimum engineering gates available today for migrations, lint, and backend verification.
- [ ] Decide whether feature work can proceed immediately or whether a bootstrap-foundation subset must land first.
- [ ] Decide the schema maintenance policy for this slice: PostgreSQL-only or all shipped dialect schemas.
- [ ] Decide whether this feature will reuse `resp` safely, patch it first, or return a feature-local response shape.
- [ ] Record all four decisions in `Technical Decision Log` before touching feature modules.

### Task 2: Openclaw Publish Identity Module

**Modules:**

- DB schema boundary
- shared domain model boundary
- seed boundary

**Confirmed files to inspect:**

- `src/config/db/schema.postgres.ts`
- `src/shared/models/apikey.ts`
- `src/shared/models/user.ts`

**New module responsibility:**

- represent the minimal Openclaw publisher identity approved in the spec
- own the publish key directly
- remain separate from `user` auth and existing `apikey.userId` ownership

- [ ] Add the minimal Openclaw publisher schema to the chosen database schema boundary.
- [ ] Define the smallest persistence model needed to look up a publisher by publish key and to create seed data.
- [ ] Keep the feature's publish identity independent from session auth and user-owned API keys.
- [ ] Decide how publish keys are stored and compared for this slice, based on current repository conventions.
- [ ] Add the seed path for one test publisher and one publish key.
- [ ] Record any identity or credential-handling tradeoff in `Technical Decision Log`.

### Task 3: Card Storage Module

**Modules:**

- DB schema boundary
- shared domain model boundary

**Confirmed files to inspect:**

- `src/config/db/schema.postgres.ts`
- `src/shared/models/`
- `src/shared/lib/hash.ts`

**New module responsibility:**

- persist minimal card metadata plus `payload_json`
- generate server-owned fields
- support create only

- [ ] Add the minimal card schema with only the fields approved by the spec.
- [ ] Decide how `payload_json` should be stored in the current DB conventions.
- [ ] Add the smallest card persistence model needed for create and basic lookup verification.
- [ ] Ensure the module, not the caller, owns generation of `card_id`, `status`, and timestamps.
- [ ] Keep update, pause, close, and other lifecycle behavior out of this slice.
- [ ] Record any storage-format or ID-generation decision in `Technical Decision Log`.

### Task 4: Publish Validation and Error Contract Module

**Modules:**

- shared validation boundary
- shared response or error-mapping boundary

**Confirmed files to inspect:**

- `src/shared/lib/resp.ts`
- one existing route that uses `zod` or local request parsing

**New module responsibility:**

- validate the request envelope only
- reject forbidden server-owned fields
- return structured errors with `field`, `reason`, and `guidance`

- [ ] Decide where feature-local validation should live based on existing repository patterns.
- [ ] Implement strict envelope validation for `card_type` and `payload`.
- [ ] Implement forbidden-field checks for `card_id`, `openclaw_id`, `status`, `created_at`, and `updated_at`.
- [ ] Keep payload business semantics intentionally loose.
- [ ] Define guidance templates for each supported error reason, with explicit "ask the user" and "do not guess" language where relevant.
- [ ] Verify the final error shape stays fully English-keyed.
- [ ] Record validation-boundary and error-contract decisions in `Technical Decision Log`.

### Task 5: Publish API Module

**Modules:**

- API route boundary
- publish identity module
- card storage module
- validation/error module

**Confirmed files to inspect:**

- existing route patterns under `src/app/api/`
- chosen publish identity model
- chosen card model

**New module responsibility:**

- accept one publish request
- authenticate the Openclaw publish key
- validate the envelope
- persist the card
- return success or structured failure

- [ ] Create the route boundary for `POST /api/openclaw/cards/publish`.
- [ ] Authenticate `Authorization: Bearer <api_key>` against the Openclaw publish identity.
- [ ] Reject missing or invalid auth without touching user session logic.
- [ ] Validate the request envelope and forbidden fields before persistence.
- [ ] Generate all server-owned fields on the backend.
- [ ] Persist cards through the feature's model boundary instead of direct route-level DB access.
- [ ] Return the minimal success payload approved in the spec.
- [ ] Record any route-shape or auth-boundary adjustments in `Technical Decision Log`.

### Task 6: Seed and Local Integration Module

**Modules:**

- seed script boundary
- migration boundary
- local verification boundary

**Confirmed files to inspect:**

- `scripts/with-env.ts`
- existing DB scripts in `package.json`

**New module responsibility:**

- let a developer create one repeatable local Openclaw publish test setup
- provide a known API key for real Openclaw integration

- [ ] Decide whether the seed path should be idempotent, resettable, or explicitly single-use.
- [ ] Add the smallest script or documented path to create one test publisher and one publish key.
- [ ] Ensure local execution order is explicit: migration first, seed second, publish test third.
- [ ] Verify that the seeded identity can publish both supported card types.
- [ ] Record any seed-repeatability caveats or cleanup steps in `Technical Decision Log`.

### Task 7: Openclaw Contract Module

**Modules:**

- product-spec doc boundary
- feature contract documentation

**Confirmed files to inspect:**

- `docs/product-specs/`
- `docs/product-specs/new-user-onboarding.md`
- approved spec file for this feature

**New module responsibility:**

- document the machine-facing contract Openclaw needs in order to publish successfully

- [ ] Create a dedicated product-spec document for the Openclaw publish contract.
- [ ] Document the request envelope, supported `card_type` values, auth header, forbidden fields, success shape, and error shape.
- [ ] Make the document explicit that payload semantics are intentionally loose in phase one.
- [ ] Make the document explicit that Openclaw must ask the user rather than guess missing information.
- [ ] Keep the contract documentation aligned with the implementation, not with future-state schema ambitions.
- [ ] Record any documentation boundary decisions in `Technical Decision Log`.

### Task 8: Final Verification and Scope Audit

**Modules:**

- all feature modules
- local verification workflow
- docs and tracker updates

**Confirmed files to inspect:**

- new feature modules created by this plan
- `docs/exec-plans/tech-debt-tracker.md`

- [ ] Run the agreed migration path and confirm the new schema objects exist.
- [ ] Run the agreed local verification path for invalid auth, invalid envelope, forbidden fields, and successful publish for both card types.
- [ ] Verify that no user onboarding, session-auth coupling, UI flow, or update-card behavior was added.
- [ ] Add any newly discovered follow-up items to `docs/exec-plans/tech-debt-tracker.md`.
- [ ] Review `Technical Decision Log` and make sure it captures real implementation choices and failed attempts.

## Verification Gates

Use the smallest real verification set available in the repository at execution time.

Minimum required outcomes:

- schema changes are generated and applied through the repository migration workflow
- the publish route rejects invalid auth
- the publish route rejects invalid envelope input with structured guidance
- the publish route rejects forbidden server-owned fields
- the publish route stores one `job_seeking` payload successfully
- the publish route stores one `recruitment` payload successfully

Preferred verification commands if bootstrap-foundation work has already landed:

- the repository's canonical `check` command
- targeted backend tests for new publish behavior
- the repository migration commands

Fallback verification if bootstrap-foundation work has not landed yet:

- currently available migration commands from `package.json`
- route-level or model-level targeted verification agreed during Task 1
- `pnpm lint`
- `pnpm build` if feature changes touch framework-integrated boundaries that should be compile-checked

## Risks and Rollback Notes

- The largest risk is accidental scope creep into onboarding, user binding, or payload semantics. Stop if implementation begins to require those systems.
- The second largest risk is auth ambiguity between user-owned keys and Openclaw-owned publish keys. Do not merge any implementation that leaves this boundary implicit.
- The current `resp` helper may not safely represent all structured error payload cases. Resolve that explicitly before standardizing this feature's response shape.
- If migration or test infrastructure is not ready, do not quietly fold bootstrap work into this feature. Pause and complete only the minimum prerequisite subset.
- If dialect support expectations are unclear, do not edit only one schema file and assume the others can be ignored.

## Technical Decision Log

Record these items during execution and keep them updated:

### Locked Decisions From Planning

- Use a dedicated Openclaw publish identity and publish key.
- Do not reuse the existing user-owned API key system for this slice.
- Use one publish endpoint for both `job_seeking` and `recruitment`.
- Store only minimal metadata plus `payload_json`.
- Validate the envelope strictly and keep payload business semantics loose.
- Treat `published` as accepted-and-stored, not publish-ready.
- Keep this slice create-only.

### Rejected Approaches

- Reusing user auth or existing user API keys for Openclaw publishing.
- Adding platform-side upload or publish UI in this slice.
- Defining a strict detailed payload schema before the publish loop is proven.
- Writing file-level code scaffolding into the implementation plan.

### Execution-Time Entries To Add

- Decisions about schema-dialect coverage.
- Decisions about response-helper reuse versus feature-local response handling.
- Decisions about publish-key storage and comparison.
- Decisions about `payload_json` storage format.
- Any failed implementation path that caused rework or revealed a hidden dependency.

## Done Criteria

This plan is complete when:

- the implementation matches the approved spec
- a seeded Openclaw publisher can authenticate and publish both card types
- invalid requests fail with structured guidance
- no out-of-scope onboarding or update behavior was added
- the technical decision log was updated during execution
- any newly discovered follow-up work is tracked in `docs/exec-plans/tech-debt-tracker.md`
