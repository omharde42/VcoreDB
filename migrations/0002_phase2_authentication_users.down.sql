BEGIN;

DROP POLICY IF EXISTS auth_events_delete_service_only ON audit.auth_events;
DROP POLICY IF EXISTS auth_events_update_service_only ON audit.auth_events;
DROP POLICY IF EXISTS auth_events_insert_service_only ON audit.auth_events;
DROP POLICY IF EXISTS auth_events_select_own_or_service ON audit.auth_events;

DROP POLICY IF EXISTS password_reset_tokens_service_only ON auth.password_reset_tokens;
DROP POLICY IF EXISTS email_verification_tokens_service_only ON auth.email_verification_tokens;
DROP POLICY IF EXISTS password_credentials_service_only ON auth.password_credentials;
DROP POLICY IF EXISTS sessions_mutate_own_or_service ON auth.sessions;
DROP POLICY IF EXISTS sessions_select_own_or_service ON auth.sessions;
DROP POLICY IF EXISTS identities_mutate_own_or_service ON auth.identities;
DROP POLICY IF EXISTS identities_select_own_or_service ON auth.identities;
DROP POLICY IF EXISTS user_profiles_mutate_own_or_service ON auth.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_own_or_service ON auth.user_profiles;
DROP POLICY IF EXISTS users_delete_service_only ON auth.users;
DROP POLICY IF EXISTS users_insert_service_only ON auth.users;
DROP POLICY IF EXISTS users_update_own_or_service ON auth.users;
DROP POLICY IF EXISTS users_select_own_or_service ON auth.users;

DROP TRIGGER IF EXISTS trg_password_reset_single_use ON auth.password_reset_tokens;
DROP TRIGGER IF EXISTS trg_email_verification_single_use ON auth.email_verification_tokens;
DROP TRIGGER IF EXISTS trg_sessions_updated_at ON auth.sessions;
DROP TRIGGER IF EXISTS trg_password_credentials_updated_at ON auth.password_credentials;
DROP TRIGGER IF EXISTS trg_identities_updated_at ON auth.identities;
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON auth.user_profiles;
DROP TRIGGER IF EXISTS trg_users_updated_at ON auth.users;

DROP FUNCTION IF EXISTS auth.purge_expired_auth_artifacts(INTERVAL);
DROP FUNCTION IF EXISTS auth.prevent_password_reset_reuse();
DROP FUNCTION IF EXISTS auth.prevent_email_verification_reuse();
DROP FUNCTION IF EXISTS auth.is_service_role();
DROP FUNCTION IF EXISTS auth.current_user_id();

DROP TABLE IF EXISTS audit.auth_events;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.password_reset_tokens;
DROP TABLE IF EXISTS auth.email_verification_tokens;
DROP TABLE IF EXISTS auth.password_credentials;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.user_profiles;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.account_statuses;

COMMIT;
