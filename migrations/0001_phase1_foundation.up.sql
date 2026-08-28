BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS core.migration_history (
  id BIGSERIAL PRIMARY KEY,
  migration_key TEXT NOT NULL,
  checksum TEXT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by TEXT NOT NULL DEFAULT CURRENT_USER,
  execution_time_ms INTEGER NULL CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (migration_key)
);

CREATE TABLE IF NOT EXISTS core.environments (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT environments_public_id_unique UNIQUE (public_id),
  CONSTRAINT environments_slug_format_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT environments_name_length_check CHECK (char_length(trim(name)) BETWEEN 2 AND 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS environments_slug_active_uk
  ON core.environments (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS environments_active_idx
  ON core.environments (is_active)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_environments_updated_at
BEFORE UPDATE ON core.environments
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TABLE IF NOT EXISTS core.system_settings (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  environment_id BIGINT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT system_settings_public_id_unique UNIQUE (public_id),
  CONSTRAINT system_settings_key_length_check CHECK (char_length(trim(setting_key)) BETWEEN 2 AND 120),
  CONSTRAINT system_settings_environment_fk
    FOREIGN KEY (environment_id)
    REFERENCES core.environments (id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS system_settings_env_key_active_uk
  ON core.system_settings (environment_id, setting_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS system_settings_secret_idx
  ON core.system_settings (is_secret)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS system_settings_environment_idx
  ON core.system_settings (environment_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_system_settings_updated_at
BEFORE UPDATE ON core.system_settings
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

COMMENT ON SCHEMA core IS 'Core transactional schema for shared VCoreDB platform data.';
COMMENT ON SCHEMA auth IS 'Authentication schema (implemented in later phases).';
COMMENT ON SCHEMA iam IS 'Authorization and permissions schema (implemented in later phases).';
COMMENT ON SCHEMA audit IS 'Audit/event schema optimized for append-heavy write patterns.';
COMMENT ON SCHEMA analytics IS 'Operational and analytical schema separated from transactional workloads.';
COMMENT ON SCHEMA app IS 'Application-specific schema. Avoid storing core identity/auth data here.';

COMMIT;
