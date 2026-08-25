# Flowdek Audit & Fix Todo List

- [x] 1. **Fix Onboarding Invitations**: Hash invitation tokens using the shared invitation service hashing helper so that invitations created during onboarding can be accepted via `/invitations/[token]`.
- [x] 2. **Fix Onboarding Profile Persistence**: Persist `name`, `jobTitle`, and `avatarColor` in PostgreSQL during onboarding and ensure NextAuth session token reflects updated profile fields.
- [x] 3. **Fix Forgot Password UI Flow**: Wire up the "Forgot password?" link/button on mobile, tablet, and desktop login screens to navigate to/render the password reset request flow (`/reset-password` or modal).
- [x] 4. **Fix Approval Deletion**: Implement `DELETE /api/approvals/[approvalId]` endpoint with proper authorization and workspace/project checks, and audit frontend deletion flow.
- [x] 5. **Fix Automations (`due_date_approaching` & trigger reconciliation)**: Implement execution for `due_date_approaching` triggers in automation cron/service, and reconcile frontend trigger definitions so UI only exposes operational triggers.
- [x] 6. **Fix Project Context Persistence for `/automations`, `/forms`, `/approvals`, `/budgets`**: Support project-scoped routes (`/projects/[projectId]/automations`, etc.) and/or persistent active project fallback from cookies/storage so page refreshes and direct navigation never lose the project context.
- [x] 7. **Audit Mutation Fetch Calls for Error Handling & Rollbacks**: Ensure all POST/PATCH/DELETE calls check `response.ok`, parse error messages, display notifications/alerts, and avoid false positive optimistic successes.
- [x] 8. **Email Verification Enforcement & Resend Path**: Audit email verification requirements. Ensure unverified users are informed with clear resend options if verification is required or verify flow handles state consistently.
- [x] 9. **Automated Unit & Integration Regression Tests**: Add comprehensive tests covering onboarding invitations, profile updates, password recovery, approval deletion, automation triggers, mutation error rollbacks, and project restoration.
- [x] 10. **Playwright E2E Test Suite**: Add an end-to-end test suite covering register → onboarding → project creation → invite teammate → accept invitation → task management → refresh persistence → approval flow → automations → password reset.
- [x] 11. **Verification**: Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and E2E tests.
