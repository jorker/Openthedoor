Primary docs:

- `docs/PRODUCT_SENSE.md`: users, value, scope, priorities, metrics
- `docs/DESIGN.md`: interaction model and UX principles
- `docs/product-specs/`: stable capability behavior and business rules
- `docs/design-docs/`: deeper capability reasoning and tradeoffs
- `docs/PLANS.md`: planning conventions
- `docs/exec-plans/active/`: implementation-ready active plans
- `docs/exec-plans/completed/`: completed plans
- `docs/exec-plans/tech-debt-tracker.md`: deferred follow-up work
- `docs/generated/db-schema.md`: current data model reference
- `docs/RELIABILITY.md`: failure, consistency, recovery rules
- `docs/SECURITY.md`: auth, privacy, abuse-prevention rules

## Compact Instructions

When compressing, preserve in priority order:

1. Architecture decisions (NEVER summarize)
2. Modified files and their key changes
3. Current verification status (pass/fail)
4. Open TODOs and rollback notes
5. Tool outputs (can delete, keep pass/fail only)

Definition of done:

- All tests pass
- Lint passes
- No TODO left behind unless explicitly tracked
