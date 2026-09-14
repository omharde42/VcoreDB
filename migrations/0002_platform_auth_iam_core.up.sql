BEGIN;

-- Organizations
CREATE TABLE IF NOT EXISTS core.organizations (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT organizations_public_id_uk UNIQUE (public_id),
  CONSTRAINT organizations_slug_format_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_active_uk
  ON core.organizations (slug) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON core.organizations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Projects
CREATE TABLE IF NOT EXISTS core.projects (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id BIGINT NOT NULL,
  ref TEXT NOT NULL,
  name TEXT NOT NULL,
  db_name TEXT NOT NULL,
  db_user TEXT NOT NULL DEFAULT 'vcore_app',
  db_password_hash TEXT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning', -- provisioning, ready, paused, maintenance, deleted
  region TEXT NOT NULL DEFAULT 'us-east-1',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT projects_public_id_uk UNIQUE (public_id),
  CONSTRAINT projects_ref_uk UNIQUE (ref),
  CONSTRAINT projects_organization_fk FOREIGN KEY (organization_id) REFERENCES core.organizations(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS projects_ref_active_uk
  ON core.projects (ref) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON core.projects
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- API Keys
CREATE TABLE IF NOT EXISTS core.api_keys (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'anon', -- anon, service_role, admin
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_keys_public_id_uk UNIQUE (public_id),
  CONSTRAINT api_keys_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS api_keys_project_role_idx ON core.api_keys (project_id, role);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON core.api_keys (key_hash);

CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON core.api_keys
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Auth Users
CREATE TABLE IF NOT EXISTS auth.users (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_app_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sign_in_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT users_public_id_uk UNIQUE (public_id),
  CONSTRAINT users_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS users_project_email_active_uk
  ON auth.users (project_id, LOWER(email)) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Auth Sessions
CREATE TABLE IF NOT EXISTS auth.sessions (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_public_id_uk UNIQUE (public_id),
  CONSTRAINT sessions_token_uk UNIQUE (token),
  CONSTRAINT sessions_refresh_token_uk UNIQUE (refresh_token),
  CONSTRAINT sessions_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE,
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON auth.sessions (user_id) WHERE revoked_at IS NULL;

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON auth.sessions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- Identity Providers (OAuth configuration per project)
CREATE TABLE IF NOT EXISTS auth.identity_providers (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  provider TEXT NOT NULL, -- google, github, microsoft, apple
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT identity_providers_public_id_uk UNIQUE (public_id),
  CONSTRAINT identity_providers_project_provider_uk UNIQUE (project_id, provider),
  CONSTRAINT identity_providers_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

-- IAM Roles & Permissions
CREATE TABLE IF NOT EXISTS iam.roles (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_public_id_uk UNIQUE (public_id),
  CONSTRAINT roles_project_name_uk UNIQUE (project_id, name),
  CONSTRAINT roles_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iam.permissions (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_public_id_uk UNIQUE (public_id),
  CONSTRAINT permissions_role_fk FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE,
  CONSTRAINT permissions_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iam.rls_policies (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  table_name TEXT NOT NULL,
  name TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'ALL', -- SELECT, INSERT, UPDATE, DELETE, ALL
  roles TEXT[] NOT NULL DEFAULT ARRAY['public'],
  definition TEXT NOT NULL, -- USING clause sql expression
  check_definition TEXT NULL, -- WITH CHECK clause sql expression
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rls_policies_public_id_uk UNIQUE (public_id),
  CONSTRAINT rls_policies_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

COMMIT;
