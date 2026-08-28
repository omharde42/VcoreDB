# VCoreDB Architecture (Phases 1-2)

## Design goals

- Reusable backend/database core across multiple applications
- Strict data integrity through relational constraints
- Clear separation between core platform data and app-specific data
- Security-first defaults and auditability-ready foundations
- Incremental, migration-driven evolution

## Layered schema strategy

- `core`: shared transactional entities and foundational utilities
- `auth`: user identity, credentials, sessions, auth token lifecycles
- `iam`: roles/permissions/authorization (future)
- `audit`: write-heavy security/audit data
- `analytics`: monitoring/usage aggregates (future)
- `app`: application-specific tables outside platform core

## Why this separation

- Keeps identity/security concerns centralized
- Prevents app-specific schema pollution in core platform model
- Enables independent scaling and retention strategies for auth/audit workloads

## Implemented in Phase 1

- Shared timestamp trigger (`core.set_updated_at`)
- Migration bookkeeping table (`core.migration_history`)
- Environment table (`core.environments`)
- System settings table (`core.system_settings`)

## Implemented in Phase 2

- Extensible account statuses (`auth.account_statuses`)
- Canonical users table (`auth.users`)
- Separate user profile table (`auth.user_profiles`)
- Provider identity model (`auth.identities`)
- Password credential isolation (`auth.password_credentials`)
- Verification/reset lifecycle token tables
- Session lifecycle model (`auth.sessions`)
- Authentication event audit table (`audit.auth_events`)
- RLS helpers and policies for user-owned auth data
- Cleanup function for expired auth artifacts

## Deferred to next phases

- Organization/project model
- Role-permission mapping and authorization enforcement (`iam`)
- API key lifecycle and credential policy
- Runtime API/service implementation
- Expanded observability and CI coverage
