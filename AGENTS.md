<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
All code written must be:

- Readable
- Well-structured
- Commented where logic is non-obvious
- Easy for another developer to pick up and extend
- Easy to understand
- Easy to maintain
- Easy to extend later
- reduce query for performance optimization

Avoid:

- Over-engineering
- Magic values
- Hard-coded assumptions

after every implementation, always check if the implementation done follows the above specifications and always include this check in the walkthough

always write git commit message in conventional style
author - Daniel130me
email - kosokodaniel@gmail.com