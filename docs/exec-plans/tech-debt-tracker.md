# Tech Debt Tracker

| Date | Area | Issue | Impact | Proposed Follow-up | Status |
|------|------|-------|--------|--------------------|--------|
| TBD | TBD | Add items discovered during execution | TBD | TBD | open |
| 2026-03-26 | card-publish | Canonical payload schemas are intentionally undefined in phase one | Future planning for matching and downstream workflows will remain ambiguous until stable schemas exist | Define stable `job_seeking` and `recruitment` payload schemas after the publish loop is proven | open |
| 2026-03-26 | card-publish | Backend only validates the request envelope, not semantic payload completeness | Stored cards may not be ready for future search, subscription, or recommendation workflows | Add semantic validation rules and readiness checks once downstream consumers are designed | open |
| 2026-03-26 | card-publish | `published` currently means accepted-and-stored rather than publish-ready | Future workflows may misinterpret stored test cards as fully usable business records | Introduce separate storage and publish-readiness states when downstream workflows are added | open |
| 2026-03-26 | onboarding | Test publisher identity is seeded manually instead of using real onboarding | Integration depends on a temporary identity shortcut and cannot represent final product behavior | Replace seeded publisher identity with real `register / claim / binding` flows | open |
| 2026-03-26 | search | Card storage is metadata plus `payload_json` only | Subscription matching and query performance will need a real search/indexing design later | Design search-friendly derived fields or indexing once subscription matching enters scope | open |
| 2026-03-26 | lifecycle | Card publishing is create-only in phase one | Product behavior for edits, pauses, closure, and downstream invalidation is undefined | Design `update-card` and lifecycle transitions after create-only publish is stable | open |
