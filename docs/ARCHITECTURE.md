# Architecture

## Boundaries

- `src/app/api` translates HTTP requests and responses. Route handlers should stay
  thin and delegate validation and business rules to server modules.
- `src/server` contains database clients, repositories, services, integrations, and
  server-side schemas. Client components must not import from this directory.
- `src/features/flowdeck` owns the product feature: UI, local state, hooks, and domain
  types used by the current frontend prototype.
- `prisma/schema.prisma` is the source of truth for persisted entities.

## Adding an endpoint

1. Define request validation beside the relevant module in `src/server`.
2. Put business rules in a service, not in the route handler.
3. Put reusable Prisma queries in a repository and select only required fields.
4. Expose the service through a route under `src/app/api`.
5. Add tests around the service and the route's validation/error mapping.

This separation keeps transport, business logic, and persistence independently
testable and prevents repeated database queries across route handlers.
