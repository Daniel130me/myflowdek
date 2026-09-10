# FlowDeck Production Deployment Guide

This guide covers taking FlowDeck from a fresh host to a running production
deployment. For local development, see the [README](./README.md).

The application enforces several **fail-fast configuration guards** added
during the security/UX audit: a production deploy with missing critical
environment variables refuses to build or boot with an actionable error,
instead of silently sending email from the wrong address, emailing dead
localhost links, or signing sessions with a missing secret.

---

## 1. Requirements

| Component  | Minimum                          | Notes                                        |
| ---------- | -------------------------------- | -------------------------------------------- |
| Node.js    | 20.9                             | Match the version used in CI / `.nvmrc`.     |
| PostgreSQL | 14+                              | Neon pooled+direct endpoints or self-hosted. |
| SMTP       | Gmail account with app password  | Transactional email (verify, reset, invite). |

---

## 2. Environment variables

Copy `.env.example` to `.env` and fill in production values. Everything below
is validated against the current source.

### 2.1 Hard requirements — build/boot fails without these

| Variable                                       | Why it fails fast                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | Prisma client cannot reach the database (use the **pooled** endpoint for app traffic).         |
| `DIRECT_URL`                                   | Used by Prisma for migrations and administrative commands (**direct** endpoint).               |
| `NEXTAUTH_SECRET`                              | `src/lib/auth.ts` throws at boot in production — sessions cannot be signed without it.         |
| `EMAIL_FROM` (or `GMAIL_SMTP_USER`)            | `src/server/email/constants.ts` throws at module load — email would send from an unknown identity. **Required at build time**, not just runtime. |
| `APP_BASE_URL` (or `NEXTAUTH_URL`)             | Same module throws — invitation/verification/reset links would point at localhost.             |
| `GMAIL_SMTP_USER` + `GMAIL_SMTP_APP_PASSWORD`  | Required to actually deliver mail over SMTP (port 587).                                        |

> **Build-time gotcha:** because the email guards live in module constants,
> `next build` itself fails (at page-data collection) when `EMAIL_FROM` /
> `GMAIL_SMTP_USER` are absent. Set them in your build environment (CI
> secrets, hosting dashboard, or a build-time `.env`), not only at runtime.

Generate the auth secret with:

```bash
openssl rand -base64 32
```

### 2.2 Feature flags and integrations

| Variable                        | Default | Purpose                                                                                    |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `REQUIRE_EMAIL_VERIFICATION`    | `false` | Audit H-19 gate. Off by default so existing accounts are not locked out. Set `true` at launch once you are ready to enforce verification. |
| `TALENT_NETWORK_ENABLED`        | `true`  | Master switch for the Talent Network surface.                                              |
| `TALENT_AI_SUGGESTIONS_ENABLED` | `false` | Talent AI matching suggestions.                                                            |
| `GEMINI_API_KEY`                | —       | Required only when AI features are enabled.                                                |
| `STORAGE_TOKEN_ENCRYPTION_KEY`  | —       | Per-user connected storage (Google Drive). Must decode to **exactly 32 bytes**.            |
| `GOOGLE_DRIVE_CLIENT_ID` / `_SECRET` / `_APP_ID` / `_DEVELOPER_KEY` | — | Google Picker / Drive integration. Optional until file-connect features are used.   |
| `R2_*` + `ENABLE_LEGACY_R2_UPLOADS` | `false` | Legacy R2 compatibility for files created before connected storage. Leave off for fresh deploys. |

### 2.3 Payments (Paystack) — not required for initial launch

The payments surface is **Paystack-only**; the placeholder Stripe surface was
removed during the audit. Payment collection is planned as a follow-up, so a
deploy without these variables is valid today:

| Variable                 | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `PAYSTACK_SECRET_KEY`    | Server-side API authentication.           |
| `PAYSTACK_PUBLIC_KEY`    | Client-side initialization.               |
| `PAYSTACK_WEBHOOK_SECRET`| Webhook signature verification.           |
| `PAYMENTS_SANDBOX_ENABLED` | Keep `false` in production.             |
| `PLATFORM_FEE_PERCENTAGE`| Platform fee shown in funding previews (default 10.0). |
| `DEFAULT_CURRENCY`       | Default `NGN`.                            |

When payments ship, point the Paystack dashboard webhook at
`/api/talent/payments/webhook` and set the same secret in
`PAYSTACK_WEBHOOK_SECRET`.

---

## 3. Database setup

Run migrations (never `db push`) against production so the migration history
stays authoritative:

```bash
npx prisma migrate deploy
```

This applies all pending migrations, including
`20260910000000_rename_workspace_guest_to_viewer` (the GUEST → VIEWER role
rename). Then generate the client:

```bash
npx prisma generate
```

### Demo seed — do NOT run in production

`npm run seed:demo` wipes and re-seeds the database with demo accounts and is
double-gated behind `ALLOW_DESTRUCTIVE_SEED=true`. Never enable that variable
in a production environment. Demo credentials (`wale.johnson@flowdeck.io`)
are also inert in production: the demo login button refuses to fire when
`NODE_ENV === 'production'` (`IS_DEMO_ENV` in `src/lib/auth.constants.ts`).

---

## 4. Build and run

```bash
npm ci
npm run build   # requires email env vars present (see §2.1)
npm start       # NODE_ENV=production
```

Prefer `npm run verify` locally before shipping — it chains
`db:generate → lint → typecheck → test → build`.

### What automatically changes in production

- Demo login is disabled (`IS_DEMO_ENV` is false when `NODE_ENV=production`).
- The frozen-mock date constants and dev email fallbacks are compiled out;
  missing configuration fails fast instead of degrading silently.
- `/admin` is reachable only by `SUPER_ADMIN` platform users; every admin API
  route independently returns 401 for anyone else.

---

## 5. Reverse proxy notes

Login rate limiting is two-axis (account + client IP) with progressive
backoff, and the general mutation rate limit is enforced centrally in
`src/proxy.ts`. Behind a reverse proxy / load balancer, make sure the platform
sets the standard forwarding headers (`X-Forwarded-For` / `X-Real-IP`) so the
IP axis sees real client addresses instead of the proxy IP.

---

## 6. Post-deploy smoke checklist

Run through this after each deploy:

1. **Login** — sign in with a real account; wrong-password attempts show the
   rate-limited message after repeated failures, not a generic error.
2. **Email round-trip** — request a password reset and receive the email;
   the link opens on your production domain (not localhost).
3. **Core loop** — create a project → add a task → move it on the board →
   confirm the change survives a reload (optimistic mutations re-sync from
   the server on failure).
4. **Tables** — open Sheet view with a long list; the header row stays pinned
   while scrolling.
5. **Roles** — invite a member with the **Viewer** role; confirm the invite
   email arrives and the role picker shows Viewer (no Guest).
6. **Admin gate** — `GET /api/admin/health` unauthenticated returns
   `{"error":"Authentication required"}`.
7. **Console** — browser console free of errors on `/projects` and `/board`.

---

## 7. Troubleshooting

| Symptom at build/boot                                                | Fix                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `[email] EMAIL_FROM or GMAIL_SMTP_USER must be set in production`    | Set `EMAIL_FROM` (build-time).                                    |
| `[email] APP_BASE_URL (or NEXTAUTH_URL) must be set in production`   | Set `APP_BASE_URL` to the public origin.                          |
| `[auth] NEXTAUTH_SECRET must be set in production`                    | Generate and set `NEXTAUTH_SECRET`.                               |
| Emails send but links 404                                            | `APP_BASE_URL` mismatch — must equal the public URL scheme+host.  |
| Prisma P1001 / connection refused                                     | `DATABASE_URL` unreachable; check pooled vs direct endpoints and SSL (`sslmode=require`). |
