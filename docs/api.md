# API Architecture

## Current implementation status

No runtime API/service implementation exists in this repository yet.

Phase 2 delivers database/auth foundations only, including users, identities, sessions, and auth lifecycle tables.

## Planned module boundaries

- `/core`
- `/database`
- `/models`
- `/schemas`
- `/services`
- `/repositories`
- `/api`
- `/auth`
- `/middleware`
- `/utils`
- `/migrations`
- `/tests`

## Planned authentication endpoints

When the runtime API layer is implemented, it should map to:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/verify-email`
- `POST /auth/request-password-reset`
- `POST /auth/reset-password`
- `GET /auth/me`

## Validation and security expectations for runtime layer

- Validate request formats and reject malformed payloads.
- Enforce account status and session validity checks.
- Use generic errors for reset/login where user enumeration risk exists.
- Never log plaintext passwords/tokens/session secrets.
- Hash all auth secrets before persistence.
