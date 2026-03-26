# Project Bootstrap Foundation Design

**Date:** 2026-03-26
**Status:** Approved in conversation, written-spec reviewed, pending user review
**Scope:** Local-first engineering foundation for starting product development on this template

## Context

This repository is a `Next.js 16 + React 19 + pnpm + TypeScript + Drizzle` template with local development scripts already present. The immediate goal is not to set up production deployment. The immediate goal is to make the repository safe and repeatable for local product development, with a lightweight but real engineering workflow that supports TDD from day one.

The project will initially be:

- developed locally
- deployed locally only
- hosted on GitHub
- worked on by one human developer plus multiple coding agents
- backed by the template's existing local PostgreSQL setup

The project should follow the template's existing local-development approach unless a missing capability blocks reliable development.

## Goals

- Preserve the template's current local-development flow instead of redesigning it.
- Make the repository reliably runnable for local development with minimal setup ambiguity.
- Add the minimum engineering gates needed before code enters `main`.
- Make the repository TDD-ready without introducing a heavy testing stack.
- Define a safe default collaboration flow for branch-based work across multiple agents.
- Keep documentation minimal and only as support for real execution workflows.

## Non-Goals

- Vercel setup or deployment automation
- Staging/production environment design
- Dockerized local database or full containerized local stack
- Full end-to-end test suite
- Heavy approval, release, or incident-management workflows
- Large documentation expansion

## Current Repository Baseline

From the current repository state:

- Existing local app scripts: `dev`, `build`, `lint`, `format`, `format:check`
- Existing local DB scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`
- Existing environment files: `.env.example`, `.env.development`
- Existing local DB convention: PostgreSQL via `.env.development`
- Existing GitHub workflow: Docker image build workflow only
- Missing explicit quality gates for this phase: `test`, `check`
- Missing project test foundation: no confirmed Vitest/Jest setup and no committed project test files

This design should preserve what already exists and only add the missing pieces.

## Design Decisions

### 1. Local Development Environment

The project will keep the template's existing local-development shape.

Required outcome:

- local development continues to use the template's existing scripts
- local environment configuration continues to use `.env.development`
- local database continues to use the existing local PostgreSQL approach
- no Docker requirement is introduced for the first phase

What will be added:

- a single minimal developer entry document describing the required local prerequisites, startup flow, database preparation flow, and basic self-check commands
- any missing helper script entries only when needed to make the flow obvious and repeatable

### 2. Quality Gates

The repository should have one clear baseline gate for code entering `main`.

Required checks:

- `lint`
- `format:check`
- `test`
- `build`

Required outcome:

- keep existing `lint`, `build`, and `format:check`
- add missing `test`
- add missing `check` command that runs the agreed baseline checks

`check` becomes the canonical "is this branch safe to merge?" command for both humans and agents.

### 3. TDD-Ready Test Foundation

The repository should gain a lightweight testing foundation suitable for TDD. The first phase should not try to build a complete testing pyramid.

Testing tool choice:

- use `Vitest` as the first-phase test runner

Reasoning:

- lightweight setup
- good TypeScript support
- fast local feedback for TDD loops
- suitable for service logic, utilities, validation logic, and route logic

Required outcome:

- install and configure Vitest
- add project test scripts
- establish test file naming/location conventions
- add 1-2 representative example tests
- make new feature work and bug fixes default toward test-backed changes when the changed behavior is business-relevant

Explicit first-phase scope for testing:

- business logic
- utility functions
- validation and transformation logic
- service-layer behavior
- API route logic where practical

Explicit first-phase non-scope for testing:

- full browser E2E coverage
- broad coverage targets
- complex UI interaction automation

### 4. GitHub Collaboration Flow

The repository should use a branch-and-PR workflow even in the single-developer phase, because multiple agents will modify code in parallel.

Required outcome:

- default workflow is branch -> PR -> checks -> merge to `main`
- direct pushes to `main` are discouraged and should be prevented where practical
- GitHub PR checks run the repository baseline gate
- branch naming should stay simple and functional, e.g. `feature/...`, `fix/...`, `chore/...`

The purpose is not ceremony. The purpose is to keep `main` stable and prevent half-finished agent output from landing directly on the main line.

### 5. Database Change Discipline

The repository should treat schema changes as tracked code changes, not as local manual actions.

Required outcome:

- schema changes must go through the existing Drizzle migration workflow
- migration artifacts must be committed together with schema-dependent code changes
- local startup flow must explicitly include checking that migrations are applied
- database structure changes should not be treated as ad hoc local-only edits

This is especially important because multiple agents working in parallel can otherwise create incompatible local assumptions.

### 6. Agent Collaboration Rules

The project should document a small number of execution rules for multi-agent work.

Required outcome:

- each agent should own a clearly bounded task
- multiple agents should avoid large simultaneous edits to the same core files
- schema/auth/core-config changes should prefer single-threaded execution
- branches should be synced with `main` before merge
- `worktree` is optional support tooling, not a requirement

The core rule is boundary clarity, not mandatory tooling.

### 7. Documentation Boundary

Documentation should exist only to support execution.

Required outcome:

- keep documentation to a minimal developer entry point plus any essential engineering workflow notes
- do not expand into broad process documentation unless implementation reveals a real need

## Final Execution Scope

The implementation plan for this design should cover these execution items:

1. Audit the template's existing local-development and quality-gate setup.
2. Add missing baseline scripts: `test`, `check`.
3. Install and configure the minimum Vitest foundation.
4. Add a small set of representative tests so the test setup is real, not theoretical.
5. Add GitHub PR automation to run the baseline gate.
6. Define and enforce the intended `main` merge flow where practical.
7. Formalize the migration workflow using the repository's existing Drizzle path.
8. Add only the minimum supporting developer guidance needed to run the above reliably.

## Acceptance Criteria

This design is successful when:

- a new agent can determine the local startup flow without guesswork
- the repository has a single canonical baseline check command
- the repository can run a real automated test suite locally
- the repository supports TDD for new backend/domain logic without further test-stack design work
- code merging to `main` has an automated PR quality gate
- schema changes have a defined, repeatable migration path
- the result remains local-first and does not pull in Vercel or production release work

## Planning Constraints

The implementation plan derived from this design should optimize for:

- preserving existing template behavior where possible
- adding the smallest real enforcement layer that improves reliability
- avoiding over-engineering in the first phase
- delivering execution items in an order that unlocks immediate product development
