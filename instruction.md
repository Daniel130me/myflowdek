Whenever you commit code, always use Conventional Commits. Never use generic messages like "Update files" or "Fix issue".

---

## Code Quality Standards

All code written must be:

- **Readable**
- **Well-structured**
- **Commented where logic is non-obvious**
- **Easy for another developer to pick up and extend**
- **Easy to understand**
- **Easy to maintain**
- **Easy to extend later**
- **Optimized to reduce queries for performance**

### Avoid

- **Over-engineering**
- **Magic values** (extract unexplained literals/strings into named constants)
- **Hard-coded assumptions** (e.g. fixed IDs, environment-specific paths, implicit types)

### Post-implementation checklist

After every implementation, always check that the work follows the above specifications. Always include this check in the walkthrough.
