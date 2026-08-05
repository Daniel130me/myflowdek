# FlowDeck

FlowDeck is a Next.js project-management application. The frontend is feature-first,
and backend-only code is isolated under `src/server` so API routes remain small and
can be extended without coupling persistence to the UI.

## Getting started

Use Node.js 20.9 or newer.

1. Copy `.env.example` to `.env`.
2. Install the locked dependencies with `npm ci`.
3. Create the local database with `npm run db:migrate`.
4. Start the app with `npm run dev`.

The app runs at `http://localhost:3000`. `GET /api/health` checks both the web service
and its database connection.

## Backend API

All request bodies are JSON. Create a user first, then use its returned `id` as a
project's `ownerId`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/users` | Create or update a user by email |
| `GET` | `/api/projects?ownerId=...` | List an owner's active projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:projectId/tasks` | List project tasks, optionally filtered by status or assignee |
| `POST` | `/api/projects/:projectId/tasks` | Create a task |
| `PATCH` | `/api/tasks/:taskId` | Update provided task fields |
| `DELETE` | `/api/tasks/:taskId` | Delete a task and its dependent records |
| `POST` | `/api/ai` | Run a validated AI assistant request |

The current frontend still uses its prototype in-memory store. These endpoints are
the persistence boundary for the next integration step.

## Git workflow

Run `npm run verify` before committing. It regenerates Prisma Client, lints,
type-checks, and creates a production build. GitHub Actions runs the same command on
pushes to `main` and on pull requests. Local environment files, build output,
dependencies, logs, and SQLite databases are excluded by `.gitignore`.

## Project structure

```text
prisma/                    Database schema and local migrations
public/                    Static, browser-accessible assets
src/
  app/                     Next.js pages, layouts, and API transport handlers
  components/ui/           Shared UI primitives used across features
  features/flowdeck/       FlowDeck components, hooks, state, and domain model
  lib/                     Framework-agnostic shared utilities
  server/                  Server-only database and external-service modules
services/                  Isolated backend service packages
legacy/                    Preserved pre-cleanup runtime artifacts
```

See `docs/ARCHITECTURE.md` for backend extension guidelines.
