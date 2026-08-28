# Database Schema (Phase 1)

## Extension

- `pgcrypto` for `gen_random_uuid()`

## Schemas

- `core`
- `auth` (reserved)
- `iam` (reserved)
- `audit` (reserved)
- `analytics` (reserved)
- `app` (reserved for application-specific data)

## Tables

### `core.migration_history`
Tracks executed migrations and metadata.

Columns:
- `id` BIGSERIAL PK
- `migration_key` TEXT UNIQUE NOT NULL
- `checksum` TEXT NULL
- `applied_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `applied_by` TEXT NOT NULL DEFAULT `current_user`
- `execution_time_ms` INTEGER CHECK `>= 0`
- `success` BOOLEAN NOT NULL DEFAULT TRUE
- `details` JSONB NOT NULL DEFAULT `{}`

### `core.environments`
Logical runtime boundaries (e.g., dev/staging/prod) for configuration scoping.

Columns:
- `id` BIGSERIAL PK
- `public_id` UUID UNIQUE NOT NULL DEFAULT `gen_random_uuid()`
- `slug` TEXT NOT NULL, format-checked
- `name` TEXT NOT NULL, length-checked
- `description` TEXT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `deleted_at` TIMESTAMPTZ NULL

Indexes/constraints:
- Partial unique index on `slug` where `deleted_at IS NULL`
- Partial index on `is_active` where `deleted_at IS NULL`

### `core.system_settings`
Key/value platform settings scoped by environment.

Columns:
- `id` BIGSERIAL PK
- `public_id` UUID UNIQUE NOT NULL DEFAULT `gen_random_uuid()`
- `environment_id` BIGINT NOT NULL FK → `core.environments(id)`
- `setting_key` TEXT NOT NULL, length-checked
- `setting_value` JSONB NOT NULL DEFAULT `{}`
- `is_secret` BOOLEAN NOT NULL DEFAULT FALSE
- `description` TEXT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `deleted_at` TIMESTAMPTZ NULL

Indexes/constraints:
- Partial unique index on (`environment_id`, `setting_key`) where `deleted_at IS NULL`
- Partial index on `is_secret` where `deleted_at IS NULL`
- Partial index on `environment_id` where `deleted_at IS NULL`

## Shared trigger

- `core.set_updated_at()` updates `updated_at` before row updates.
- Applied to:
  - `core.environments`
  - `core.system_settings`

## Soft deletion pattern

`deleted_at` is nullable on mutable config/domain tables. Partial unique indexes enforce uniqueness among active rows while preserving historical records.
