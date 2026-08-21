
# Fixed product rules

These rules apply to every phase:

1. The feature is called **Flowdek Talent Network**.
2. Any Flowdek user may become both:

   * someone hiring professionals; and
   * a professional offering services.
3. Creating an account must not automatically create a public professional profile.
4. Users must explicitly select **Offer my services**.
5. Professional identity must remain separate from workspace and project roles.
6. Hiring must be connected to a specific Flowdek task.
7. External professionals must not automatically become full project members.
8. External professionals receive access only to:

   * their assigned task;
   * task comments;
   * task requirements;
   * task deliverables;
   * files explicitly attached or shared with that task.
9. Do not expose unrelated project tasks, budgets, documents, members or settings.
10. Do not build or operate a custom escrow or wallet.
11. Payments and payouts must be handled through a compliant marketplace payment provider.
12. Reviews must come only from genuine completed engagements.
13. Preserve all existing project, task, document, storage, authentication and permission functionality.
14. Reuse existing Flowdek patterns and services instead of creating duplicate systems.
15. All database migrations and seed processes must be idempotent and reversible where possible.

---

# Phase 0 — Existing-system audit

## Objective

Understand how the Talent Network should integrate with the current Flowdek implementation before changing the database or writing feature code.

## Agent instructions

Inspect:

* current Prisma/database schema;
* user model;
* workspace membership;
* project membership;
* task ownership and assignment;
* permission/capability system;
* file and task attachment permissions;
* notification system;
* activity/audit logging;
* API conventions;
* frontend routing;
* validation and error handling;
* existing payment code, if any;
* existing test setup.

Produce an implementation map showing:

* existing models that will be reused;
* existing models that require relationships;
* new models required;
* required permissions;
* API routes;
* frontend pages;
* services;
* migrations;
* security-sensitive areas.

## Do not build yet

Do not add marketplace models or UI during this phase.

## Completion criteria

The phase is complete only when the agent reports:

* current architecture discovered;
* exact files likely to change;
* schema relationships;
* permission strategy;
* risks or conflicting implementations;
* proposed migration order;
* test commands available in the repository.

---

# Phase 1 — Competency taxonomy and professional profiles

## Objective

Allow a Flowdek user to opt in as a professional and create a structured professional profile.

## Data models

Adapt these names to the existing schema without duplicating equivalent models:

```text
ProfessionalProfile
ProfessionalRole
Skill
ProfessionalSkill
PortfolioItem
ProfessionalAvailability
```

Suggested profile fields:

```text
ProfessionalProfile
- id
- userId
- slug
- professionalTitle
- bio
- yearsOfExperience
- visibility
- status
- location
- timezone
- remotePreference
- rateType
- minimumRate
- maximumRate
- currency
- availabilityStatus
- weeklyAvailableHours
- createdAt
- updatedAt
```

Use controlled enums:

```text
ProfileStatus
- DRAFT
- PUBLISHED
- SUSPENDED

ProfileVisibility
- PRIVATE
- FLOWDEK_USERS

AvailabilityStatus
- AVAILABLE_NOW
- AVAILABLE_SOON
- LIMITED
- UNAVAILABLE

RateType
- HOURLY
- FIXED
- NEGOTIABLE

ProficiencyLevel
- BEGINNER
- INTERMEDIATE
- ADVANCED
- EXPERT
```

Important rules:

* One professional profile per user.
* A new profile starts as `DRAFT` and `PRIVATE`.
* Only the profile owner can edit it.
* Only a valid and complete profile can be published.
* Do not expose the professional’s private email, phone number or account information.
* Professional skills must reference the shared skill taxonomy.
* Self-declared skills must not be marked as verified.
* Portfolio URLs must be validated.

## Initial role examples

```text
Backend Engineer
Frontend Engineer
Full-Stack Engineer
UI/UX Designer
Product Designer
Project Manager
DevOps Engineer
Cloud Engineer
Data Analyst
QA Engineer
Cybersecurity Specialist
Technical Writer
Digital Marketer
Business Analyst
```

## Initial skill examples

Create a sensible, idempotent seed set grouped by category:

```text
Software Development
Design
Project Management
Cloud and DevOps
Data
Marketing
Business
Writing
Quality Assurance
Security
```

## UI

Create:

```text
/talent/profile
/talent/profile/edit
```

Profile sections:

* professional title;
* bio;
* roles;
* skills and proficiency;
* experience;
* rate;
* availability;
* location and timezone;
* portfolio;
* profile preview;
* publish/unpublish action.

## APIs

Suggested endpoints:

```text
GET    /api/talent/profile/me
POST   /api/talent/profile
PATCH  /api/talent/profile
POST   /api/talent/profile/publish
POST   /api/talent/profile/unpublish

GET    /api/talent/roles
GET    /api/talent/skills
POST   /api/talent/profile/portfolio
PATCH  /api/talent/profile/portfolio/:itemId
DELETE /api/talent/profile/portfolio/:itemId
```

## Do not build yet

Do not add:

* professional search;
* invitations;
* job opportunities;
* proposals;
* task access;
* engagements;
* payments;
* ratings;
* AI matching.

## Acceptance criteria

* A user can opt into the Talent Network.
* A user can create and edit only their own profile.
* Profiles remain private until explicitly published.
* Duplicate professional profiles cannot be created.
* Skill and role seeds do not duplicate when run repeatedly.
* Invalid portfolio URLs and rate ranges are rejected.
* Private contact information is not returned by public APIs.
* Mobile and desktop layouts work.

Suggested commit:

```text
feat(talent): add professional profiles and competency taxonomy
```

---

# Phase 2 — Professional directory and search

## Objective

Allow authenticated Flowdek users to discover published professionals.

## UI

Create:

```text
/talent
/talent/professionals/:slug
```

The directory must support:

* search by name, title, role or skill;
* filter by role;
* filter by skill;
* filter by availability;
* filter by location or timezone;
* filter by remote preference;
* filter by rate type and range;
* pagination;
* clear empty states;
* professional profile cards;
* profile detail page.

Professional cards should show:

* name;
* professional title;
* primary roles;
* top skills;
* availability;
* rate range, when supplied;
* location/timezone;
* portfolio summary;
* verified indicators only where verification actually exists.

## Backend requirements

Use server-side filtering and pagination. Do not download every professional and filter in the browser.

Suggested endpoint:

```text
GET /api/talent/professionals
```

Supported query parameters:

```text
search
roleId
skillIds
availability
location
timezone
remotePreference
rateType
minimumRate
maximumRate
page
limit
sort
```

Profile detail:

```text
GET /api/talent/professionals/:slug
```

Only return profiles where:

```text
status = PUBLISHED
visibility = FLOWDEK_USERS
```

Add database indexes for commonly filtered fields and relation tables.

## Sorting

Initially support:

```text
RELEVANCE
NEWEST
RATE_LOW_TO_HIGH
RATE_HIGH_TO_LOW
```

Do not claim that `RELEVANCE` is intelligent matching yet. It can use text, role and skill matches.

## Do not build yet

Do not add task invitations, applications, payments or AI recommendations.

## Acceptance criteria

* Draft and private profiles never appear in search.
* Suspended profiles cannot be viewed.
* Search and filters work together.
* Pagination is stable and deterministic.
* Restricted user fields are never returned.
* Profiles cannot be discovered by manipulating identifiers.
* Empty results and API failures have proper UI states.

Suggested commit:

```text
feat(talent): add professional directory and filtered search
```

---

# Phase 3 — Task competency requirements and direct invitations

## Objective

Connect existing Flowdek tasks to required competencies and allow authorized managers to invite professionals.

## Data models

```text
TaskCompetencyRequirement
TalentInvitation
```

Suggested requirement fields:

```text
TaskCompetencyRequirement
- id
- taskId
- skillId
- minimumProficiency
- isRequired
- notes
- createdAt
- updatedAt
```

Suggested invitation fields:

```text
TalentInvitation
- id
- taskId
- professionalProfileId
- invitedById
- message
- proposedBudget
- currency
- proposedDeadline
- status
- expiresAt
- respondedAt
- createdAt
- updatedAt
```

Invitation statuses:

```text
PENDING
ACCEPTED
DECLINED
WITHDRAWN
EXPIRED
```

## Task UI changes

On the task page, add:

```text
Assign task
├── Assign existing team member
└── Find a professional
```

Add a **Required competencies** section.

Authorized users can:

* add required skills;
* specify minimum proficiency;
* mark skills required or preferred;
* search matching professionals;
* invite a professional;
* include a message, proposed budget and deadline.

## Important behavior

Accepting an invitation means:

> The professional is interested in proceeding.

It must not:

* assign the task automatically;
* grant project access;
* activate an engagement;
* initiate payment.

Those actions occur in later phases.

## Permissions

Only users with an existing task-management permission, or a new capability such as:

```text
MANAGE_TASK_TALENT
```

may create or withdraw invitations.

Professionals may only view invitations sent to their own profile.

## APIs

```text
GET    /api/tasks/:taskId/competencies
PUT    /api/tasks/:taskId/competencies

POST   /api/tasks/:taskId/talent-invitations
GET    /api/tasks/:taskId/talent-invitations
DELETE /api/tasks/:taskId/talent-invitations/:invitationId

GET    /api/talent/invitations
POST   /api/talent/invitations/:invitationId/accept
POST   /api/talent/invitations/:invitationId/decline
```

## Acceptance criteria

* Only authorized project users can change competency requirements.
* Users cannot invite professionals to projects they cannot access.
* Professionals cannot read another professional’s invitations.
* Duplicate pending invitations for the same task and professional are prevented.
* Expired and withdrawn invitations cannot be accepted.
* Accepting an invitation does not expose the project.

Suggested commit:

```text
feat(talent): connect task competencies and professional invitations
```

---

# Phase 4 — Task opportunities and proposals

## Objective

Allow managers to publish selected tasks as opportunities and allow professionals to apply.

## Data models

```text
TalentOpportunity
TalentProposal
```

Opportunity statuses:

```text
DRAFT
PUBLISHED
CLOSED
AWARDED
CANCELLED
```

Proposal statuses:

```text
SUBMITTED
SHORTLISTED
ACCEPTED
REJECTED
WITHDRAWN
```

Budget types:

```text
FIXED
HOURLY
NEGOTIABLE
```

## Critical privacy rule

Do not publish the full task or project automatically.

The manager must explicitly provide or approve the public opportunity content:

* public title;
* public description;
* required competencies;
* budget type and range;
* currency;
* expected duration;
* application deadline;
* deliverables summary.

Never expose:

* private project documents;
* client information;
* internal comments;
* private attachments;
* workspace members;
* overall project budget;
* unrelated tasks.

## UI

Create:

```text
/talent/opportunities
/talent/opportunities/:opportunityId
/projects/:projectId/tasks/:taskId/publish-opportunity
```

Professional actions:

* browse opportunities;
* filter by role, skill, rate, duration and date;
* view an opportunity;
* submit one proposal;
* edit a proposal while it remains submitted;
* withdraw a proposal before selection.

Manager actions:

* publish/unpublish an opportunity;
* view applicants;
* compare proposals;
* shortlist;
* reject;
* accept one proposal;
* close or cancel the opportunity.

## Proposal fields

```text
- proposedPrice
- currency
- estimatedDuration
- coverMessage
- proposedApproach
- optional milestone suggestion
```

## Important transition rule

Accepting a proposal must happen inside a database transaction:

1. Mark the chosen proposal `ACCEPTED`.
2. Mark other active proposals `REJECTED`.
3. Mark the opportunity `AWARDED`.
4. Create a draft engagement.
5. Do not grant project access until the engagement is accepted.

## Acceptance criteria

* Only published opportunities appear to professionals.
* A professional cannot apply to their own opportunity.
* One active proposal per professional per opportunity.
* Closed, awarded or cancelled opportunities reject new proposals.
* Proposal prices and currencies are validated.
* Accepting two proposals for the same opportunity is prevented.
* Private project information never appears in opportunity APIs.

Suggested commit:

```text
feat(talent): add task opportunities and professional proposals
```

---

# Phase 5 — Engagements and scoped contractor access

## Objective

Create a formal working relationship and give the hired professional access only to the contracted task.

## Data models

```text
Engagement
EngagementMilestone
EngagementDeliverable
EngagementActivity
```

Engagement statuses:

```text
DRAFT
AWAITING_PROFESSIONAL_ACCEPTANCE
ACTIVE
WORK_SUBMITTED
COMPLETED
CANCELLED
DISPUTED
```

Milestone statuses:

```text
PENDING
ACTIVE
SUBMITTED
APPROVED
REJECTED
CANCELLED
```

## Engagement workflow

```text
Proposal accepted
      ↓
Draft engagement created
      ↓
Manager confirms scope and milestones
      ↓
Professional accepts engagement
      ↓
Engagement becomes active
      ↓
Task-scoped access is granted
      ↓
Professional submits deliverables
      ↓
Manager approves or requests changes
      ↓
Engagement completes
```

## Scoped access

Create a centralized access check such as:

```ts
canAccessTaskAsExternalProfessional(userId, taskId)
```

Do not scatter incomplete access rules across controllers.

An external professional may access only:

* the contracted task;
* its approved public/contract scope;
* comments on that task;
* milestones;
* deliverables;
* explicitly task-shared attachments.

They may not access:

* project dashboard;
* other tasks;
* project documents;
* project finances;
* internal discussions;
* workspace settings;
* member management.

## UI

Create an engagement workspace:

```text
/talent/engagements
/talent/engagements/:engagementId
```

Include:

* scope;
* agreed price;
* deadline;
* milestones;
* task discussion;
* deliverables;
* submission history;
* status timeline;
* cancellation or dispute request.

## Audit trail

Record important events:

* engagement created;
* accepted;
* access granted;
* milestone submitted;
* revision requested;
* milestone approved;
* deliverable submitted;
* engagement completed;
* cancellation requested;
* dispute opened.

## Acceptance criteria

* External users cannot access the containing project.
* Task access starts only after engagement acceptance.
* Access ends when an engagement is cancelled.
* Completed engagements remain readable to their participants.
* Deliverables cannot be submitted by unrelated users.
* Status transitions are validated server-side.
* Every sensitive transition has an audit event.

Suggested commit:

```text
feat(talent): add engagements and task-scoped contractor access
```

---

# Phase 6 — Payment provider investigation

## Objective

Choose a compliant payment provider before implementing financial transactions.

This is a research and architecture phase. Do not add production payment logic yet.

## Investigate

Confirm whether the provider supports Flowdek’s intended markets and business model:

* marketplace/platform payments;
* customer checkout;
* professional onboarding;
* identity verification/KYC;
* subaccounts or connected accounts;
* platform fees;
* split payments;
* delayed payouts;
* refunds;
* disputes and chargebacks;
* webhook signatures;
* transaction reconciliation;
* supported currencies;
* Nigerian customers and professionals;
* international customers and professionals;
* settlement timing;
* prohibited business categories;
* test/sandbox environment.

## Required output

The agent must report:

* recommended provider;
* alternative provider;
* exact features confirmed;
* unsupported requirements;
* regulatory or operational risks;
* proposed payment flow;
* initial countries and currency;
* environment variables;
* webhook requirements;
* whether “escrow” is legally and technically accurate.

Do not describe the system as escrow unless the selected provider explicitly supports that arrangement and its terms permit Flowdek’s use case.

---

# Phase 7 — Payments and milestone releases

## Dependency

Do not start until Phase 6 produces an approved provider and payment flow.

## Objective

Allow clients to pay for engagements and professionals to receive provider-managed payouts.

## Provider abstraction

Use an interface similar to:

```ts
interface MarketplacePaymentProvider {
  createProfessionalAccount(...)
  createCheckout(...)
  verifyWebhook(...)
  getPaymentStatus(...)
  requestRefund(...)
  createOrReleasePayout(...)
}
```

Do not place provider-specific code throughout controllers and UI components.

## Data models

Adapt as required:

```text
ProfessionalPaymentAccount
EngagementPayment
PaymentTransaction
ProfessionalPayout
PaymentWebhookEvent
Refund
```

Payment states:

```text
UNFUNDED
FUNDING_PENDING
FUNDED
RELEASE_PENDING
RELEASED
REFUND_PENDING
REFUNDED
FAILED
DISPUTED
```

Use the provider’s real semantics. Do not mark a payment funded from a frontend redirect.

## Security requirements

* Payment amounts must be calculated server-side.
* The client must not supply trusted payout account IDs.
* Verify webhook signatures.
* Process webhooks idempotently.
* Store the provider event ID and reject duplicate processing.
* Never store raw card details.
* Never store banking credentials unnecessarily.
* Use decimal-safe money representation.
* Store currency as an ISO code.
* Log every payment status transition.
* Prevent milestone release before valid funding.
* Require authorization before refunds or releases.

## MVP payment flow

```text
Engagement accepted
      ↓
Client funds engagement or milestone
      ↓
Provider confirms payment by webhook
      ↓
Work begins
      ↓
Professional submits milestone
      ↓
Client approves
      ↓
Provider processes release/payout
      ↓
Flowdek updates status from webhook
```

## Initial limitation

Launch payment support with one clearly defined region and currency based on Phase 6. Keep the database multi-currency capable, but do not claim unsupported currencies.

## Acceptance criteria

* Sandbox payments complete end-to-end.
* Forged webhook calls fail.
* Duplicate webhooks do not create duplicate transactions.
* Failed payments do not activate funded work.
* Users cannot release another engagement’s funds.
* Amounts cannot be changed from browser requests.
* Payment and engagement states remain consistent.
* Refund and payout failures have recoverable states.

Suggested commit:

```text
feat(talent): add provider-managed engagement payments
```

---

# Phase 8 — Completion, reviews and trust signals

## Objective

Allow both parties to review one another after a genuine completed engagement.

## Models

```text
ProfessionalReview
ClientReview
ProfessionalMetrics
```

Professional review criteria:

```text
Quality
Communication
Technical competence
Timeliness
Would hire again
Written feedback
```

Client review criteria:

```text
Requirement clarity
Communication
Professionalism
Payment reliability
Would work again
Written feedback
```

## Rules

* Reviews require a completed engagement.
* Only engagement participants may review.
* One review per reviewer per engagement.
* Reviews cannot be created for cancelled proposals or invitations.
* Aggregate ratings must be calculated server-side.
* Do not allow users to submit arbitrary rating aggregates.
* Reviews should remain associated with the engagement.
* Add reporting and moderation capability.
* Payment reliability must not be rated when no Flowdek payment occurred.

## Initial professional metrics

Calculate only from verifiable Flowdek activity:

* completed engagements;
* completion rate;
* on-time completion rate;
* average rating;
* repeat hire count;
* response rate;
* total verified reviews.

Do not create a “verified skill” badge from self-declared proficiency.

## Acceptance criteria

* Reviews cannot be submitted early.
* Unrelated users cannot review professionals.
* Rating averages update correctly.
* Removed or moderated reviews no longer affect aggregates.
* Profile pages clearly distinguish declared information from verified Flowdek history.

Suggested commit:

```text
feat(talent): add verified engagement reviews and trust metrics
```

---

# Phase 9 — Competency matching and recommendations

## Objective

Recommend professionals for a task and explain why each professional matches.

Start with transparent rules before adding AI.

## Initial scoring

Use a configurable scoring service. For example:

```text
Required skill coverage       40%
Preferred skill coverage      15%
Role relevance                10%
Availability                  10%
Budget compatibility          10%
Verified engagement history   10%
Timezone compatibility         5%
```

Do not hard-code these weights inside UI components.

## Recommendation response

Every recommendation should explain its result:

```text
92% match

Why this professional matches:
- Has all three required skills
- Expert in Node.js
- Available immediately
- Rate is within budget
- Completed four similar Flowdek engagements
```

Do not show false precision if insufficient profile data exists. Use labels such as:

```text
Strong match
Good match
Partial match
```

## Optional AI assistance

AI may extract suggested competencies from a task description, but:

* it must not silently change the task;
* the project manager must confirm suggested competencies;
* existing structured fields remain the source of truth;
* matching must still work when AI is unavailable;
* do not send private task content to an external model without appropriate disclosure and controls.

## APIs

```text
GET  /api/tasks/:taskId/talent-matches
POST /api/tasks/:taskId/suggest-competencies
```

## Acceptance criteria

* Required skills have more weight than preferred skills.
* Private profiles never appear.
* Unavailable professionals can be excluded.
* Match explanations correspond to actual stored data.
* Matching still works when AI is disabled.
* Tests cover several candidates with predictable rankings.

Suggested commit:

```text
feat(talent): add explainable task-to-professional matching
```

---

# Phase 10 — Security, moderation and launch hardening

## Objective

Prepare the Talent Network for controlled production release.

## Build

* feature flag;
* report professional;
* report opportunity;
* report proposal/message;
* suspend professional profile;
* opportunity moderation;
* rate limiting;
* spam prevention;
* blocked-user handling;
* notification preferences;
* payment monitoring;
* webhook monitoring;
* audit log review;
* data export/deletion handling;
* terms acceptance version;
* privacy controls;
* administrator tools;
* error monitoring;
* performance indexes;
* responsive and accessibility checks.

## Security test scenarios

Test attempts to:

* view private profiles;
* access another user’s proposal;
* publish a task from another project;
* invite someone without permission;
* access a project through an engagement URL;
* view unrelated task attachments;
* modify proposal price after acceptance;
* accept multiple proposals;
* approve your own professional submission;
* forge payment webhooks;
* submit duplicate payout events;
* leave fake reviews;
* bypass suspended-profile restrictions.

## Controlled launch

Use a feature flag:

```text
TALENT_NETWORK_ENABLED
```

Recommended rollout:

1. Internal administrators.
2. Selected workspaces.
3. Invitation-only professionals.
4. Nigerian NGN transactions in sandbox.
5. Limited real transactions.
6. Wider release after monitoring disputes, failures and abuse.

Suggested commit:

```text
feat(talent): harden talent network for controlled release
```

# Required verification after every implementation phase

The agent must run the repository’s actual commands, including equivalents of:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

If the repository contains multiple applications, run the appropriate commands for each affected application.

After every phase, require the agent to report:

* schema changes;
* migrations created;
* files changed;
* APIs added;
* UI pages added;
* permission checks added;
* tests added;
* exact command results;
* environment variables required;
* manual setup still required;
* known limitations;
* unrelated functionality checked;
* suggested conventional commit message.

The agent must not say a phase is complete merely because components, models or routes exist. The complete user workflow for that phase must function and be tested.

# Recommended release boundary

Your first usable MVP should include:

```text
Phase 0: Audit
Phase 1: Professional profiles
Phase 2: Professional directory
Phase 3: Direct task invitations
Phase 5: Engagements and scoped task access
```