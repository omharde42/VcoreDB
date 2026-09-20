# VCoreDB

VCoreDB is a modular, developer-focused PostgreSQL-first Backend-as-a-Service (BaaS) and developer platform built with Node.js, Express, TypeScript, Vitest, and Docker.

## Platform Capabilities

VCoreDB centralizes core backend concerns so developer teams can focus on application logic:

- **Managed Relational PostgreSQL Engine:** Automated migrations, multi-schema isolation (`core`, `auth`, `iam`, `audit`, `analytics`, `app`, `storage`, `functions`, `webhooks`, `billing`).
- **Platform & User Authentication:** Full auth suite supporting signup, login, session revocation, OAuth integrations (Google, GitHub), user profiles, and JWT tokens.
- **Auto-Generated Database REST API:** Full CRUD operations (`GET`, `POST`, `PATCH`, `DELETE`) with dynamic filter operators (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `in`, `is`), pagination, sorting, limit, and schema introspection.
- **API Key Management:** Scoped public anon keys and privileged service-role keys with hashed storage and usage tracking.
- **Realtime WebSockets Engine:** Direct subscription layer for PostgreSQL table inserts, updates, and deletes (`/realtime/v1`).
- **S3-Compatible Object Storage:** Bucket management, file uploads, metadata tracking, and signed URL generation (`/api/v1/projects/:projectRef/storage`).
- **Edge Functions & Webhooks:** Serverless code execution with timeout controls and event webhooks with retry capabilities.
- **GitHub Integration:** Repository linking, repository sync, and automated codebase gap/health analysis.
- **Organization & IAM Model:** Multi-tenant organization boundaries, project isolation, and role-based permissions (Owner, Admin, Developer, Viewer).
- **Stripe Billing & Quotas:** Tiered billing plans, quota enforcement, and usage tracking.
- **CLI & Client SDK:** Cross-platform command-line tool (`vcoredb-cli`) and typed TypeScript client library (`@vcoredb/client`).

## Architecture Overview

VCoreDB strictly maintains database schema isolation:
- `core`: Shared transactional entities, projects, organizations, API keys, system settings, and migration history
- `auth`: Users, account statuses, provider identities, password credentials, verification/reset tokens, and sessions
- `iam`: Organizations, members, roles, permissions, and organization invites
- `audit`: Security events and operational audit trails
- `analytics`: Usage metrics, bandwidth, API calls, and storage counters
- `app`: User application tables
- `storage`: Buckets, objects, access policies, and storage usage
- `functions`: Edge functions, deployments, invocation logs, and environment variables
- `webhooks`: Webhook endpoints, subscribed events, delivery attempts, and delivery logs
- `billing`: Customer profiles, subscriptions, usage quotas, and expansion packs

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
