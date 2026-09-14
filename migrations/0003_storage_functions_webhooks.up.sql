BEGIN;

-- Storage Buckets
CREATE TABLE IF NOT EXISTS storage.buckets (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  file_size_limit BIGINT NULL, -- limit in bytes
  allowed_mime_types TEXT[] NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT buckets_public_id_uk UNIQUE (public_id),
  CONSTRAINT buckets_project_name_active_uk UNIQUE (project_id, name),
  CONSTRAINT buckets_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_buckets_updated_at
BEFORE UPDATE ON storage.buckets
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Storage Objects
CREATE TABLE IF NOT EXISTS storage.objects (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  bucket_id BIGINT NOT NULL,
  name TEXT NOT NULL, -- file path inside bucket
  owner_user_id BIGINT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT objects_public_id_uk UNIQUE (public_id),
  CONSTRAINT objects_bucket_name_uk UNIQUE (bucket_id, name),
  CONSTRAINT objects_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE,
  CONSTRAINT objects_bucket_fk FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS objects_bucket_idx ON storage.objects (bucket_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_objects_updated_at
BEFORE UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Serverless Edge Functions
CREATE TABLE IF NOT EXISTS functions.functions (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive
  runtime TEXT NOT NULL DEFAULT 'nodejs22',
  entrypoint TEXT NOT NULL DEFAULT 'index.handler',
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  env_vars JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT functions_public_id_uk UNIQUE (public_id),
  CONSTRAINT functions_project_slug_uk UNIQUE (project_id, slug),
  CONSTRAINT functions_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_functions_updated_at
BEFORE UPDATE ON functions.functions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Function Deployments
CREATE TABLE IF NOT EXISTS functions.deployments (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  function_id BIGINT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  code_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deployments_public_id_uk UNIQUE (public_id),
  CONSTRAINT deployments_function_version_uk UNIQUE (function_id, version),
  CONSTRAINT deployments_function_fk FOREIGN KEY (function_id) REFERENCES functions.functions(id) ON DELETE CASCADE
);

-- Function Invocations/Logs
CREATE TABLE IF NOT EXISTS functions.invocation_logs (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  function_id BIGINT NOT NULL,
  status_code INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  log_output TEXT NULL,
  error_message TEXT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invocation_logs_public_id_uk UNIQUE (public_id),
  CONSTRAINT invocation_logs_function_fk FOREIGN KEY (function_id) REFERENCES functions.functions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS invocation_logs_function_idx ON functions.invocation_logs (function_id, executed_at DESC);

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhooks.endpoints (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL, -- e.g. ['database.insert', 'auth.signup', 'storage.upload']
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT endpoints_public_id_uk UNIQUE (public_id),
  CONSTRAINT endpoints_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE TRIGGER trg_webhook_endpoints_updated_at
BEFORE UPDATE ON webhooks.endpoints
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS webhooks.deliveries (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  endpoint_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER NULL,
  response_body TEXT NULL,
  duration_ms INTEGER NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deliveries_public_id_uk UNIQUE (public_id),
  CONSTRAINT deliveries_endpoint_fk FOREIGN KEY (endpoint_id) REFERENCES webhooks.endpoints(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS deliveries_endpoint_idx ON webhooks.deliveries (endpoint_id, created_at DESC);

-- Audit & Central System Logs
CREATE TABLE IF NOT EXISTS audit.system_logs (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NULL,
  service TEXT NOT NULL, -- api, auth, db, realtime, storage, functions, webhooks, system
  level TEXT NOT NULL DEFAULT 'info', -- debug, info, warn, error
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT system_logs_public_id_uk UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS system_logs_project_service_idx ON audit.system_logs (project_id, service, created_at DESC);

-- Backups
CREATE TABLE IF NOT EXISTS core.backups (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT backups_public_id_uk UNIQUE (public_id),
  CONSTRAINT backups_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

COMMIT;
