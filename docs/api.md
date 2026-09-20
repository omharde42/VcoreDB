# API Architecture & Endpoints

## Base URL
`/api/v1`

## Authentication & Headers
- **API Key Authorization:** Header `x-vcore-api-key: <vcore_anon_key_or_vcore_service_key>`
- **User Bearer Token:** Header `Authorization: Bearer <jwt_token>`
- **Platform Admin Key:** Header `x-vcore-admin-key: <admin_key>`

## Key Endpoint Routes

### 1. Platform & User Authentication (`/api/v1/auth`)
- `POST /auth/signup` - Register platform user account
- `POST /auth/login` - Authenticate user & issue JWT
- `GET /auth/me` - Retrieve current user profile
- `POST /auth/logout` - Revoke current session

### 2. Projects & Organizations (`/api/v1/projects`)
- `GET /projects` - List user projects
- `POST /projects` - Create new project
- `GET /projects/:projectRef` - Get project details
- `DELETE /projects/:projectRef` - Delete project
- `GET /projects/:projectRef/api-keys` - List project API keys
- `POST /projects/:projectRef/api-keys` - Generate new API key
- `POST /projects/:projectRef/api-keys/:keyId/revoke` - Revoke API key

### 3. Database REST Operations (`/api/v1/projects/:projectRef/db`)
- `GET /db/tables` - Introspect project database tables
- `GET /db/:tableName` - Query table records with filters (`eq`, `gt`, `lt`, `like`, etc.), `limit`, `offset`, and `sort`
- `POST /db/:tableName` - Insert row into table
- `PATCH /db/:tableName` - Update rows matching filters
- `DELETE /db/:tableName` - Delete rows matching filters
- `POST /db/sql` - Execute parameterized SQL script safely

### 4. Storage Engine (`/api/v1/projects/:projectRef/storage`)
- `GET /storage/buckets` - List buckets
- `POST /storage/buckets` - Create bucket
- `POST /storage/buckets/:bucket/upload` - Upload file
- `GET /storage/buckets/:bucket/objects/*` - Download file
- `POST /storage/buckets/:bucket/signed-url` - Generate temporary signed access URL

### 5. Serverless Functions & Webhooks (`/api/v1/projects/:projectRef`)
- `GET /functions` - List serverless functions
- `POST /functions` - Deploy new function
- `POST /functions/:name/invoke` - Execute function
- `GET /webhooks` - List configured webhooks
- `POST /webhooks` - Register webhook endpoint

### 6. GitHub Integration (`/api/v1/projects/:projectRef/github`)
- `GET /github/user` - Check connected GitHub user
- `GET /github/repos` - List accessible GitHub repositories
- `POST /github/import` - Link repository to project & perform gap/health analysis
- `GET /github/repo` - Fetch linked repo details and codebase analysis
- `POST /github/sync` - Re-sync and re-analyze codebase

## Validation and security expectations for runtime layer

- Validate request formats and reject malformed payloads.
- Enforce account status and session validity checks.
- Use generic errors for reset/login where user enumeration risk exists.
- Never log plaintext passwords/tokens/session secrets.
- Hash all auth secrets before persistence.
