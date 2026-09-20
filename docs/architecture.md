# VCoreDB Platform Architecture

## Platform Overview

VCoreDB is designed as a PostgreSQL-first Backend-as-a-Service (BaaS) platform providing multi-tenant project isolation, API key routing, REST database APIs, real-time WebSocket notifications, serverless function invocation, object storage, and integration with GitHub and Stripe.

## Layered Schema Architecture

VCoreDB uses PostgreSQL schema separation to cleanly isolate platform metadata from user application data:

1. `core`: Projects, organizations, API key credentials, environment configs, GitHub repository links, and migration histories.
2. `auth`: Users, account statuses, provider identities (Google/GitHub OAuth), password credentials, verification tokens, reset tokens, and active sessions.
3. `iam`: Roles, permissions, organization memberships, and role assignments.
4. `audit`: Security event logs, auth events, and platform action auditing.
5. `analytics`: API usage counters, database bandwidth, storage metrics, and project quota consumption.
6. `app`: End-user database application tables.
7. `storage`: Buckets, object metadata, access policies, and storage quotas.
8. `functions`: Serverless functions, deployment versions, execution logs, and secrets.
9. `webhooks`: Webhook endpoints, subscribed event triggers, delivery logs, and retry attempts.
10. `billing`: Subscription plans, Stripe customer IDs, usage quotas, and expansion packs.

## Core Backend Services

- **API Gateway (`server/gateway.ts`):** Handles authentication middleware, project key validation, user session decoding, and API request routing.
- **Database Engine (`server/db.ts`):** Manages PostgreSQL connections and executes migration scripts in strict sequence.
- **REST API Generator (`server/rest.ts`):** Converts HTTP requests into parameterized SQL queries with strict tenant isolation.
- **Realtime Gateway (`server/realtime.ts`):** WebSocket broadcast engine for real-time table mutation notifications.
- **Storage Engine (`server/storage.ts`):** Manages buckets and file storage on disk with MIME validation and signed URL generation.
- **Function Runner (`server/functions.ts`):** Serverless function execution engine with environment variable injection and execution timeouts.
- **GitHub Integration (`server/github.ts`):** Repository import, automated codebase dependency analysis, and health reporting.
- **Admin & Observability (`server/admin.ts`, `server/observability.ts`):** Metrics monitoring, audit logging, and platform administrator management.
