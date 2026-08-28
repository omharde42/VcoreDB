# VCoreDB

VCoreDB is a modular PostgreSQL-first backend foundation designed to be reused across multiple applications.

## Why VCoreDB exists

Most projects repeatedly rebuild users, auth, organizations, API credentials, and auditing from scratch. VCoreDB centralizes those concerns into a clean, evolvable core schema so app teams can focus on domain logic.

## Current status

This repository now implements:
- **Phase 1: Database Foundation + Schema**
- **Phase 2: Authentication + Users**

Implemented in Phase 2:
- User/account model with extensible account states
- Separated user profile model
- Provider-based authentication identity model
- Password credential storage and reset-token lifecycle tables
- Email verification token lifecycle tables
- Session management foundation with revocation/expiration fields
- Authentication event audit table
- Row-Level Security (RLS) policies for user-owned data
- Cleanup function for expired auth artifacts

Planned next phases:
1. Organizations/projects
2. Roles + permissions
3. API keys + developer access
4. Audit logging expansion
5. API/service layer
6. Monitoring/usage
7. Testing + CI/CD expansion
8. Documentation + production hardening

## Architecture

High-level schema separation:
- `core`: shared transactional platform entities
- `auth`: users, credentials, sessions, identity providers
- `iam`: roles, permissions, authorization (future phase)
- `audit`: security/audit event data
- `analytics`: operational and usage metrics (future phase)
- `app`: application-specific data (outside core platform model)

See `/docs/architecture.md`, `/docs/database-schema.md`, `/docs/authentication.md`, and `/docs/security.md`.

## Features (Phases 1-2)

- PostgreSQL migration foundation
- Strict relational constraints (PK, FK, unique, check, NOT NULL)
- `created_at`, `updated_at`, and lifecycle tracking
- UUID support for externally exposed identifiers (`public_id`)
- Password-secret/token-secret hashing storage model (no plaintext secrets)
- RLS foundations for private auth/user data

## Technology stack

- PostgreSQL 14+
- SQL migrations (plain SQL, review-friendly)

## Database structure

Tables added in Phase 1:
- `core.migration_history`
- `core.environments`
- `core.system_settings`

Tables added in Phase 2:
- `auth.account_statuses`
- `auth.users`
- `auth.user_profiles`
- `auth.identities`
- `auth.password_credentials`
- `auth.email_verification_tokens`
- `auth.password_reset_tokens`
- `auth.sessions`
- `audit.auth_events`

## Authentication model

Authentication identity is modular:

`auth.users` (VCore identity) ← 1:N → `auth.identities` (provider identities)

Password and token secrets are isolated from profile data:
- `auth.password_credentials`
- `auth.email_verification_tokens`
- `auth.password_reset_tokens`

Session state is tracked in:
- `auth.sessions`

## API architecture

No runtime API/service implementation exists yet. Phase 2 delivers the secure database/auth foundation required for a later API layer.

Target module boundaries remain:
`/core`, `/database`, `/models`, `/schemas`, `/services`, `/repositories`, `/api`, `/auth`, `/middleware`, `/utils`, `/migrations`, `/tests`.

## Security model

- No plaintext credentials/tokens in schema design
- RLS enforced on user-owned auth tables
- Service-role separation via session settings and policies
- Account state, verification, and revocation-aware lifecycle fields

See `/docs/security.md`.

## Setup instructions

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and update values.
3. Apply migrations in order:
   - `migrations/0001_phase1_foundation.up.sql`
   - `migrations/0002_phase2_authentication_users.up.sql`

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

Phase 2 includes SQL-level validation scenarios in `tests/phase2_authentication.sql`.

## Contribution guidelines

See `CONTRIBUTING.md` (to be added in a later phase).

## Roadmap

- [x] Phase 1: Database foundation + schema
- [x] Phase 2: Authentication + users
- [ ] Phase 3: Organizations/projects
- [ ] Phase 4: Roles + permissions
- [ ] Phase 5: API keys + developer access
- [ ] Phase 6: Audit logging
- [ ] Phase 7: API/service layer
- [ ] Phase 8: Monitoring/usage
- [ ] Phase 9: Testing + CI/CD
- [ ] Phase 10: Documentation + production hardening
