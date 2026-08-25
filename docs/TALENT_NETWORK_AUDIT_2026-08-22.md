# Talent Network implementation audit — 2026-08-22

## Scope

This audit reviewed the Talent Network across Prisma schema and migrations,
authorization, profile privacy, directory search, invitations, engagements,
payments, reviews, matching, moderation, UI failure states, CI coverage, and
production build behavior.

## Resolved in `fix/talent-network-audit`

### Deployment and CI integrity

- Added the missing Phase 4 opportunity/proposal migration.
- Added the missing engagement, milestone, payment, review, and metrics migration.
- Reconciled and deployed the migrations to the configured Neon database.
- Synchronized `package-lock.json`, including `@google/genai` and SWC transitive dependencies.
- Added all newer Talent test suites to the default `npm test` command.
- Restored the accidentally deleted authenticated `/api/talent/skills` route.

### Directory and invitation correctness

- Fixed expired invitation responses so the `EXPIRED` state is committed before returning a conflict.
- Made accept/decline and withdrawal transitions conditional and concurrency-safe.
- Added future-deadline and budget/currency validation.
- Changed directory rate filtering to range-overlap semantics and forced null rates to the end of rate sorting.
- Made management UI permissions fail closed and added network-error cleanup paths.

### Engagement access boundaries

- Activated contractor task access from the engagement state instead of project membership.
- Preserved an existing internal task assignee when an external professional accepts an engagement.
- Added a reduced external task projection that excludes project-only custom fields, hierarchy, creator, and assignment metadata.
- Verified that access begins on acceptance and ends on cancellation.

### Payment security

- Server-calculates the trusted funding amount from the engagement or selected milestone.
- Restricts the initial provider flow to NGN and rejects browser amount/currency tampering.
- Prevents duplicate active funding rows for the same engagement or milestone.
- Requires an active engagement, approved milestone, and verified payout account at the relevant transitions.
- Atomically claims funded payments before payout release to prevent double release.
- Makes sandbox simulation explicit, development-only, and disabled by default.
- Makes the provider fail closed instead of converting live API failures into fake sandbox success.
- Uses provider-managed refund states and preserves uncertain operations for reconciliation.

### Privacy, trust, and rollout

- Requires task-edit permission for matching and competency suggestions.
- Makes external AI task-content sharing opt-in with `TALENT_AI_SUGGESTIONS_ENABLED=true`.
- Requires authentication and published visibility before exposing another profile's review history.
- Makes payment reliability optional and rejects it when no Flowdek payment occurred.
- Applies `TALENT_NETWORK_ENABLED=false` across Talent pages, Talent APIs, and task-integrated Talent endpoints.
- Prevents moderation reinstatement from bypassing normal profile publish validation.
- Routes every Talent API through the centralized active-account and session-version check.

## Verified baseline

- Prisma schema and all 20 migrations are synchronized with Neon.
- `npm ci --dry-run` succeeds.
- Full suite: 307 tests passed, 0 failed.
- TypeScript: passed.
- ESLint: 0 errors; one pre-existing non-Talent navigation warning remains.
- Next.js production build: passed, including the Next.js 16 proxy.
- Local `/api/health`: HTTP 200 with database connected.

## Remaining hardening backlog

These items are not silently treated as complete:

1. **Provider reconciliation:** add transfer/refund webhook handlers and an operations reconciliation job for payments left in `RELEASE_PENDING` or `REFUND_PENDING`.
2. **Engagement concurrency:** convert every remaining engagement and proposal state transition to conditional database claims, following the invitation, acceptance, and payout patterns added in this audit.
3. **Complete contractor workspace:** add task-scoped comment and explicitly shared attachment endpoints. External professionals can now read the contracted task and use engagement deliverables, but project-wide comment/file endpoints remain correctly unavailable.
4. **Moderation cases:** replace report-as-audit-log storage with a report/case model supporting target validation, rate limits, status, assignment, evidence, and resolution history.
5. **Financial retention policy:** define product behavior when a workspace containing payout history is deleted. Current restrictive financial foreign keys preserve records but require an explicit archive/retention flow.
6. **Matching depth:** replace the current smoke test with deterministic multi-candidate ranking tests covering required skills, availability, budget, history, and timezone explanations.
7. **Provider configuration:** keep `PAYMENTS_SANDBOX_ENABLED=false` in production and do not enable real transactions until Paystack credentials, webhook delivery, payout reconciliation, monitoring, and legal terms are approved.

## Maintainability review

The changes reuse centralized authorization and service boundaries, use named
configuration flags instead of magic behavior, preserve explicit DTOs for
privacy, keep database queries bounded and indexed, and add regression tests at
the state and permission boundaries. No unrelated local files or port settings
were included in the audit commits.
