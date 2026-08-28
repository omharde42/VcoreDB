# VCoreDB Architecture (Phase 1)

## Design goals

- Reusable backend/database core across multiple applications
- Strict data integrity through relational constraints
- Clear separation between core platform data and app-specific data
- Security-first defaults and auditability-ready foundations
- Incremental, migration-driven evolution

## Layered schema strategy

- `core`: shared transactional entities and foundational utilities
- `auth`: authentication domain (future)
- `iam`: roles/permissions/authorization (future)
- `audit`: write-optimized event/audit data (future)
- `analytics`: monitoring/usage aggregates (future)
- `app`: application-specific tables outside platform core

## Why this separation

- Keeps identity/security concerns centralized
- Prevents app-specific schema pollution in core platform model
- Enables independent scaling and retention strategies for audit/analytics workloads

## Implemented in Phase 1

- Shared timestamp trigger (`core.set_updated_at`)
- Migration bookkeeping table (`core.migration_history`)
- Environment table (`core.environments`)
- System settings table (`core.system_settings`)

## Deferred to next phases

- User/account/authentication data model
- Organization/project model
- Role-permission mapping and authorization enforcement
- API key lifecycle and credential policy
- High-volume audit/event ingestion design
- Service/API layer implementation
