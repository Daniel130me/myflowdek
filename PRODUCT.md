# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Flowdek serves people and teams who plan and deliver project work. Any authenticated
Flowdek user may manage projects and may separately choose to offer professional
services through the Flowdek Talent Network.

## Product Purpose

Flowdek keeps project planning, tasks, collaboration, documents, and delivery
records in one workspace. The Talent Network adds an opt-in professional identity
that can later connect project owners with people who can complete real project
work.

## Positioning

Talent discovery is grounded in Flowdek's project workflow: a professional profile
is separate from workspace authority, and future hiring must grant only the access
needed for the relevant task or engagement.

## Operating Context

- Users work in authenticated Next.js product screens backed by PostgreSQL.
- Workspaces contain projects; projects contain tasks, documents, files, and teams.
- User-owned file bytes remain in connected cloud storage while Flowdek stores
  metadata and encrypted provider credentials.
- Professional profiles are personal account data and do not change workspace or
  project membership.

## Capabilities and Constraints

- Account registration never creates a professional profile automatically.
- A user must explicitly choose **Offer my services** before a profile exists.
- New professional profiles start as private drafts.
- Professional roles and skills use a shared, seeded taxonomy.
- Phase 1 supports profile editing, portfolio items, preview, and publish controls.
- Search, opportunities, proposals, engagements, task-only external access,
  payments, ratings, and AI matching are later phases.
- Flowdek will not implement a custom wallet or escrow system. A compliant
  marketplace payments provider will be selected before payment work begins.
- Existing project, task, document, storage, authentication, and permission
  behavior must remain unchanged.

## Brand Commitments

The product name is **Flowdek** and the feature name is **Flowdek Talent Network**.
Product copy should be direct, calm, and operational rather than promotional.

## Evidence on Hand

The repository contains the working product shell, project-management flows,
authorization matrix, audit log, notifications, connected-storage integration,
and architecture documentation. No verified talent ratings, customer claims,
payment provider, or marketplace performance data exists yet and none should be
fabricated.

## Product Principles

1. Professional identity is explicit and user-controlled.
2. Profile visibility defaults to private and expands only by deliberate action.
3. Professional identity never implies workspace or project authorization.
4. Reuse Flowdek's established service and security boundaries.
5. Add marketplace capabilities in independently testable phases.

## Accessibility & Inclusion

Talent profile forms and controls must work with keyboard navigation, visible
focus states, programmatic labels, readable contrast, and responsive layouts on
mobile and desktop.
