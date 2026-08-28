# Security Model (Phases 1-2)

## Secure defaults implemented

- UUIDs for externally exposed identifiers (`public_id`)
- Strict relational constraints (PK/FK/UNIQUE/CHECK/NOT NULL)
- No raw credentials or secrets stored in repository files
- Migration-first schema evolution
- RLS enabled and forced for user/auth data

## Authentication secret handling

Phase 2 separates secret-bearing records from normal profile data:
- Password hashes in `auth.password_credentials`
- Session secret hashes in `auth.sessions`
- Verification/reset token hashes in `auth.email_verification_tokens` and `auth.password_reset_tokens`

Security requirements enforced by schema:
- No plaintext token/password columns
- Expiration timestamps on token/session lifecycles
- Single-use token lifecycle enforcement through constraints + triggers

## Account and login safety

- Account lifecycle state is explicit via `auth.users.status_code`
- Login lock-tracking metadata (`failed_login_attempts`, `locked_until`) is isolated in password credentials
- Session revocation supported with `revoked_at` + reason fields
- Multiple concurrent sessions are supported without secret duplication

## RLS decisions

RLS helpers:
- `auth.current_user_id()` reads `request.user_id`
- `auth.is_service_role()` reads `request.is_service_role`

Policy strategy:
- Owner/service access on user-owned tables: users, profiles, identities, sessions
- Service-only access on secret-bearing tables: password credentials, verification tokens, reset tokens
- Auth events writable by service-role, readable only by relevant users or service-role

This avoids broad "allow all" policies and prevents public leakage of secret-bearing auth records.

## Audit event guidance

`audit.auth_events` is intended for security-relevant auth events (registration, login success/failure, logout, session revoke, password/email lifecycle changes).

Never place raw passwords, tokens, session secrets, or other credentials into `event_metadata`.

## Data retention and cleanup

`auth.purge_expired_auth_artifacts(interval)` provides a safe cleanup primitive for:
- expired/revoked sessions
- terminal verification tokens
- terminal reset tokens

Recommended operation:
- execute from trusted scheduled worker/cron
- keep a retention buffer for revoked sessions before delete
- avoid deleting active/valid rows

## Environment and secret management

- `.env` is excluded from source control
- `.env.example` includes placeholders only
- Production secrets must come from secure secret managers/runtime injection

## Deferred security work

- Full authorization policy model in `iam` (Phase 3+)
- Runtime rate limiting at API/service boundary
- Extended audit/monitoring pipelines for auth telemetry
