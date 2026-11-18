# Phase 1 Roadmap — Farmer and Farm Records

The former Phase 1 design-system plan is superseded: the existing application already has a shared UI library and responsive dashboard structure.

The current Phase 1 objective is to persist farmer profiles and make farm/crop records dependable:

1. Create/update farmer profile data during onboarding using the existing Auth UID.
2. Preserve compatibility with current UID-owned farms, crops, jobs, and products.
3. Complete reachable create, read, and edit behavior for farms and crops; preserve harvest history.
4. Validate ownership and inputs and show explicit loading, empty, and error states.
5. Verify security rules and targeted lint/build or service/form tests.

Acceptance criteria and subsequent phases are tracked in [implementation-roadmap.md](implementation-roadmap.md).
