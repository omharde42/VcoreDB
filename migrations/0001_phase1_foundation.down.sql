BEGIN;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON core.system_settings;
DROP TRIGGER IF EXISTS trg_environments_updated_at ON core.environments;

DROP TABLE IF EXISTS core.system_settings;
DROP TABLE IF EXISTS core.environments;
DROP TABLE IF EXISTS core.migration_history;

DROP FUNCTION IF EXISTS core.set_updated_at();

DROP SCHEMA IF EXISTS app;
DROP SCHEMA IF EXISTS analytics;
DROP SCHEMA IF EXISTS audit;
DROP SCHEMA IF EXISTS iam;
DROP SCHEMA IF EXISTS auth;
DROP SCHEMA IF EXISTS core;

COMMIT;
