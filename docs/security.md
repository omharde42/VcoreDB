# Security Model (Phase 1)

## Secure defaults implemented

- UUIDs for externally exposed identifiers (`public_id` columns)
- Strict relational constraints (PK/FK/UNIQUE/CHECK/NOT NULL)
- No raw credentials or secrets stored in repository files
- Soft deletion for recoverability and auditability
- Migration-first schema changes for reviewability and reproducibility

## Secret handling guidance

- `.env` is excluded from source control
- Environment variables must supply connection strings and sensitive values
- `core.system_settings.is_secret` flags values requiring encrypted-at-rest/controlled-access behavior in the future service layer

## Planned security work

- Authentication/session schema and secure credential storage (Phase 2)
- Role/permission authorization model (Phase 4)
- API key hashing/revocation/access controls (Phase 5)
- Audit event schema and security telemetry (Phase 6)
- Row-level policies where needed for multi-tenant access control
