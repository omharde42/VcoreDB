# Development Workflow

## Phase-oriented delivery

VCoreDB is built incrementally to reduce risk:
1. Database foundation + schema
2. Authentication + users
3. Organizations/projects
4. Roles + permissions
5. API keys + developer access
6. Audit logging
7. API/service layer
8. Monitoring/usage
9. Testing + CI/CD
10. Documentation + production hardening

## Migration rules

- Every schema change must be in an ordered migration file.
- Use paired `*.up.sql` and `*.down.sql` files.
- Keep changes backward-compatible whenever possible.
- Never modify production schema manually.

## Quality and safety

- Prefer small, reviewable diffs.
- Preserve integrity with constraints and indexes.
- Keep sensitive values out of source control.
- Validate migration syntax before proposing release.
