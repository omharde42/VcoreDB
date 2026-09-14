# Database Schema (Phases 1-2)

## Extension

- `pgcrypto` for `gen_random_uuid()`

## Schemas

- `core`
- `auth`
- `iam` (reserved)
- `audit`
- `analytics` (reserved)
- `app` (reserved for application-specific data)

---

## Phase 1 tables

### `core.migration_history`
Tracks executed migrations and metadata.

### `core.environments`
Logical runtime boundaries (e.g., dev/staging/prod) for configuration scoping.

### `core.system_settings`
Key/value platform settings scoped by environment.

Shared Phase 1 trigger:
- `core.set_updated_at()`

---

## Phase 2 tables

### `auth.account_statuses`
Data-driven account lifecycle states.

Key columns:
- `code` (PK)
- `description`
- `is_login_allowed`
- `created_at`

Seeded states:
- `active`
- `pending_verification`
- `suspended`
- `disabled`

### `auth.users`
Canonical identity row for each user.

Key columns:
- Internal PK `id`
- External UUID `public_id`
- Unique normalized `email`
- Optional `username`
- `status_code` FK → `auth.account_statuses(code)`
- `email_verified_at`
- `profile_metadata`
- last-login metadata
- `created_at`, `updated_at`

Constraints/indexes:
- `UNIQUE(email)`
- Email normalization/format checks
- Optional username format check + unique index
- status and login-time indexes

### `auth.user_profiles`
1:1 user profile extension table (non-secret data only).

Key columns:
- `user_id` PK/FK → `auth.users(id)`
- `display_name`, `avatar_url`, `bio`, `timezone`, `locale`
- `preferences` JSONB
- `created_at`, `updated_at`

### `auth.identities`
Provider identities linked to users.

Key columns:
- `id` PK, `public_id` UUID
- `user_id` FK → `auth.users(id)`
- `provider`
- `provider_user_id`
- `provider_email`
- `provider_metadata`
- `is_primary`
- `last_authenticated_at`
- `created_at`, `updated_at`

Constraints/indexes:
- `UNIQUE(provider, provider_user_id)`
- `UNIQUE(user_id, provider)`
- provider lookup indexes

### `auth.password_credentials`
Password authentication material (isolated from profile data).

Key columns:
- `user_id` PK/FK → `auth.users(id)`
- `password_hash`
- `password_algorithm`
- `password_changed_at`
- failed/lock tracking fields
- `created_at`, `updated_at`

### `auth.email_verification_tokens`
Single-use email verification token records.

Key columns:
- `id` PK
- `user_id` FK
- `email`
- `token_hash` (unique)
- `expires_at`
- `verified_at`
- `invalidated_at`
- `created_at`

Constraints/indexes:
- active token uniqueness per user/email
- hash lookup and expiration indexes
- trigger-enforced reuse prevention

### `auth.password_reset_tokens`
Single-use password reset token records.

Key columns:
- `id` PK
- `user_id` FK
- `token_hash` (unique)
- `expires_at`
- `used_at`
- `invalidated_at`
- request metadata
- `created_at`

Constraints/indexes:
- one active token per user
- hash lookup and expiration indexes
- trigger-enforced reuse prevention

### `auth.sessions`
Authenticated session lifecycle table.

Key columns:
- `id` PK, `public_id` UUID
- `user_id` FK
- `identity_id` FK (nullable)
- `session_secret_hash` (unique)
- `expires_at`
- `last_activity_at`
- `revoked_at`, `revoked_reason`
- client metadata
- `created_at`, `updated_at`

Indexes support:
- user session lookup
- active-session lookup
- expiration cleanup
- identity-linked session lookup

### `audit.auth_events`
Authentication/security event records linked to auth entities.

Key columns:
- `id` PK, `public_id` UUID
- `event_type`
- `actor_user_id`, `target_user_id`
- `identity_id`, `session_id`
- `is_success`, `failure_code`
- metadata/client fields
- `occurred_at`

Indexes support:
- by target user + recency
- by event type + recency
- by session + recency

---

## Triggers/functions added in Phase 2

- `core.set_updated_at()` reused on mutable Phase 2 tables
- `auth.current_user_id()` RLS helper
- `auth.is_service_role()` RLS helper
- `auth.prevent_email_verification_reuse()` trigger function
- `auth.prevent_password_reset_reuse()` trigger function
- `auth.purge_expired_auth_artifacts(interval)` cleanup function

---

## RLS summary

RLS enabled + forced:
- `auth.users`
- `auth.user_profiles`
- `auth.identities`
- `auth.password_credentials`
- `auth.email_verification_tokens`
- `auth.password_reset_tokens`
- `auth.sessions`
- `audit.auth_events`

Ownership/service-role policies are defined to prevent cross-user access and protect secret-bearing tables.
