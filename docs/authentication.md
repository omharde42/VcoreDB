# Authentication Architecture (Phase 2)

## Scope

Phase 2 establishes the authentication and user-management database foundation for VCoreDB. It does **not** implement the runtime API/service layer yet.

## Model overview

Core entities:
- `auth.users`: canonical VCoreDB user identity
- `auth.user_profiles`: extensible profile data (separate from authentication secrets)
- `auth.identities`: provider identities (`provider` + `provider_user_id`)
- `auth.password_credentials`: password hash + lock/failure tracking
- `auth.email_verification_tokens`: secure email verification token lifecycle
- `auth.password_reset_tokens`: secure password reset token lifecycle
- `auth.sessions`: authenticated session lifecycle and revocation
- `audit.auth_events`: security/audit events for auth flows

## User model

`auth.users` includes:
- Internal PK `id` (BIGSERIAL)
- External-safe `public_id` (UUID)
- Unique normalized `email`
- Optional `username`
- `status_code` FK to `auth.account_statuses`
- `email_verified_at`
- `last_login_*` metadata
- `created_at`, `updated_at`

Account states are data-driven through `auth.account_statuses`.
Default seeded states:
- `active`
- `pending_verification`
- `suspended`
- `disabled`

Additional states can be added later by inserting new rows into `auth.account_statuses`.

## Profile model

`auth.user_profiles` is a 1:1 extension table for user-owned profile data:
- `display_name`
- `avatar_url`
- `bio`
- `timezone`
- `locale`
- `preferences` JSONB

Authentication secret material is intentionally excluded from this table.

## Identity/provider model

`auth.identities` enables multiple auth providers and future expansion.

Rules:
- One identity belongs to exactly one VCoreDB user.
- `UNIQUE(provider, provider_user_id)` prevents duplicate provider-link collisions.
- `UNIQUE(user_id, provider)` prevents duplicate provider entries per user.

This supports email/password now and future OAuth providers without schema redesign.

## Password security

Password material is isolated in `auth.password_credentials`:
- `password_hash` only (no plaintext, no reversible secrets)
- `password_algorithm`
- lock/failure tracking fields (`failed_login_attempts`, `locked_until`, `last_failed_login_at`)

Reset flow metadata is isolated in `auth.password_reset_tokens`:
- hashed reset token (`token_hash`)
- `expires_at`
- `used_at`/`invalidated_at`
- request metadata (`requested_ip`, `requested_user_agent`)

Single-use and expiry enforcement is implemented with constraints + trigger guards.

## Email verification

`auth.email_verification_tokens` stores hashed verification tokens with lifecycle metadata:
- `token_hash`
- `expires_at`
- `verified_at`
- `invalidated_at`

Security controls:
- token hashes are unique
- tokens expire
- active-token uniqueness per user/email
- trigger prevents re-consumption

## Session architecture

`auth.sessions` supports:
- multiple concurrent sessions per user
- session revocation (`revoked_at`, `revoked_reason`)
- expiration (`expires_at`)
- activity tracking (`last_activity_at`)
- secure storage via hashed session secret (`session_secret_hash`)

Session rows reference both `user_id` and optional `identity_id` to answer:
- Who is authenticated?
- Which provider identity authenticated them?
- Is the session active/revoked/expired?

## Audit integration

Authentication events are recorded in `audit.auth_events` with references to user/session/identity where available.

Target event types include:
- `auth.registration`
- `auth.login.success`
- `auth.login.failure`
- `auth.logout`
- `auth.session.revoked`
- `auth.password.changed`
- `auth.password.reset.requested`
- `auth.password.reset.completed`
- `auth.email.verified`
- `auth.account.status_changed`

Do not store passwords, raw tokens, or session secrets in `event_metadata`.

## Row-level security (RLS)

RLS is enabled and forced on auth/user tables.

Policy model:
- user-owned tables (`auth.users`, `auth.user_profiles`, `auth.identities`, `auth.sessions`) allow owner access and service-role access
- secret tables (`auth.password_credentials`, `auth.email_verification_tokens`, `auth.password_reset_tokens`) are service-role only
- auth events are service-writable; users can only read events related to themselves

Helper functions:
- `auth.current_user_id()` from `request.user_id`
- `auth.is_service_role()` from `request.is_service_role`

## Cleanup and retention

`auth.purge_expired_auth_artifacts(interval)` safely deletes:
- expired/revoked sessions (with retention window for revoked sessions)
- terminal email verification tokens
- terminal password reset tokens

Recommended scheduling: invoke from an external worker/cron with a conservative retention policy.

## API endpoint contract (for future runtime phase)

Phase 2 does not add runtime endpoints. The expected API contract for a future service layer is:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/verify-email`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /auth/me`

Implementations must:
- hash password/reset/verification/session secrets before persistence
- use generic failure messages to reduce account-enumeration risk
- enforce account state and session validity checks
