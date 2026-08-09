# Flowdek Email Verification + Password Reset — TODO

> Source of truth for the email verification and password reset features.
> Previous work (notifications, R2 files, search — commits up to `5398132`)
> is complete.

## 12. Email verification + password reset

```
Registration → Verification email → Verify account

Forgot password → Email token → Reset password → Invalidate token
```

Uses Twilio SendGrid for email delivery (sender: kosokodaniel@gmail.com).

The `VerificationToken` model already exists in the schema (Phase 6 of the
foundation). This phase completes the flow: generate tokens, send emails,
verify, and reset.

---

## Phased implementation plan

### Phase 1 — Email service + constants
- [ ] Install `@sendgrid/mail`
- [ ] `src/server/email/service.ts` — sendEmail via SendGrid
- [ ] `src/server/email/constants.ts` — sender, subjects, TTLs, URLs
- [ ] `src/lib/auth.constants.ts` — add token TTL + type constants
- **Commit:** `feat(email): add SendGrid email service`

### Phase 2 — Email verification flow
- [ ] `src/server/auth/verification.service.ts` — generate + verify tokens
- [ ] Wire into register route: send verification email on signup
- [ ] `POST /api/auth/verify-email` — verify the token, set emailVerifiedAt
- [ ] `POST /api/auth/resend-verification` — resend if expired/lost
- **Commit:** `feat(auth): add email verification flow`

### Phase 3 — Password reset flow
- [ ] `src/server/auth/password-reset.service.ts` — generate + verify reset tokens
- [ ] `POST /api/auth/forgot-password` — send reset email
- [ ] `POST /api/auth/reset-password` — verify token + set new password
- [ ] Tokens invalidated (usedAt set) after use
- **Commit:** `feat(auth): add password reset flow`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | — | pending |
| 2 | — | pending |
| 3 | — | pending |
