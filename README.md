# VCoreDB

VCoreDB is a modular PostgreSQL-first backend foundation designed to be reused across multiple applications.

## Why VCoreDB exists

Most projects repeatedly rebuild users, auth, organizations, API credentials, and auditing from scratch. VCoreDB centralizes those concerns into a clean, evolvable core schema so app teams can focus on domain logic.

## Current status

This repository currently implements **Phase 1: Database Foundation + Schema**.

Implemented in Phase 1:
- Ordered SQL migrations
- Core/future schema boundaries (`core`, `auth`, `iam`, `audit`, `analytics`, `app`)
- UUID support for externally exposed identifiers
- Timestamp/update tracking trigger
- Foundational core tables for migration and system configuration
- Soft-deletion-aware uniqueness patterns

Planned next phases:
1. Authentication + users
2. Organizations/projects
3. Roles + permissions
4. API keys + developer access
5. Audit logging
6. API/service layer
7. Monitoring/usage
8. Testing + CI/CD
9. Documentation + production hardening

## Architecture

High-level schema separation:
- `core`: shared transactional platform entities
- `auth`: authentication (future phase)
- `iam`: roles, permissions, authorization (future phase)
- `audit`: append-heavy audit/event data (future phase)
- `analytics`: operational and usage metrics (future phase)
- `app`: application-specific data (outside core platform model)

See `/docs/architecture.md` and `/docs/database-schema.md`.

## Features (Phase 1)

- PostgreSQL migration foundation
- Strict relational constraints (PK, FK, unique, check, NOT NULL)
- `created_at`, `updated_at`, `deleted_at` patterns
- Secure defaults (`gen_random_uuid()` via `pgcrypto`)
- Indexes aligned to expected lookup/filter patterns

## Technology stack

- PostgreSQL 14+
- SQL migrations (plain SQL, review-friendly)

## Database structure (Phase 1)

Tables added:
- `core.migration_history`
- `core.environments`
- `core.system_settings`

## Authentication model

Planned in Phase 2. Includes users, profiles, sessions, provider links, account states, and verification status.

## Authorization model

Planned in Phase 4. Includes extensible roles and permissions through `iam` schema.

## API architecture

Planned in Phase 7. Target layering:
`/core`, `/database`, `/models`, `/schemas`, `/services`, `/repositories`, `/api`, `/auth`, `/middleware`, `/utils`, `/migrations`, `/tests`.

## Security model

- No plaintext secrets in repository
- Secret-like settings can be flagged (`is_secret`) for stricter handling at service layer
- Relational constraints protect integrity
- Soft deletion preserves history
- Future phases will add RLS/policy guidance where applicable

See `/docs/security.md`.

## Setup instructions

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and update values.
3. Apply migrations in order:
   - `migrations/0001_phase1_foundation.up.sql`

## Environment variables

Defined in `.env.example`.

## Migration instructions

- Apply `*.up.sql` files in lexical order.
- Roll back using matching `*.down.sql` file when needed.
- Never change production schema outside migrations.

## Development workflow

- Keep migrations small and reviewable.
- Add constraints with each schema addition.
- Prefer additive, backward-compatible changes.
- Update docs with every schema change.

See `/docs/development.md`.

## Testing

Planned in Phase 9. Initial validation in Phase 1 is migration-level/syntax-level.

## Contribution guidelines

See `CONTRIBUTING.md` (to be added in a later phase).

## Roadmap

- [ ] Phase 1: Database foundation + schema
- [ ] Phase 2: Authentication + users
- [ ] Phase 3: Organizations/projects
- [ ] Phase 4: Roles + permissions
- [ ] Phase 5: API keys + developer access
- [ ] Phase 6: Audit logging
- [ ] Phase 7: API/service layer
- [ ] Phase 8: Monitoring/usage
- [ ] Phase 9: Testing + CI/CD
- [ ] Phase 10: Documentation + production hardening
