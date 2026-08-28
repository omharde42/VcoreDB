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

## Local migration flow

1. Apply migrations in lexical order:
   - `migrations/0001_phase1_foundation.up.sql`
   - `migrations/0002_phase2_authentication_users.up.sql`
2. Validate rollback path with matching down migrations when needed.

## Auth schema validation

Run SQL validation scenarios after migrations:
- `tests/phase2_authentication.sql`

This script verifies key data-integrity, token/session lifecycle, and RLS behavior in a rollback transaction.

## Cleanup operations

Phase 2 adds `auth.purge_expired_auth_artifacts(interval)`.

Recommended pattern:
- invoke from a trusted worker/cron
- use a retention window for revoked sessions
- avoid direct ad hoc deletes on auth lifecycle tables

## Quality and safety

- Prefer small, reviewable diffs.
- Preserve integrity with constraints and indexes.
- Keep sensitive values out of source control.
- Validate migration syntax before proposing release.
