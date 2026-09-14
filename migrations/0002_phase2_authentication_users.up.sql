BEGIN;

CREATE TABLE IF NOT EXISTS auth.account_statuses (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_login_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_statuses_code_format_check CHECK (code ~ '^[a-z][a-z0-9_]{1,62}$')
);

INSERT INTO auth.account_statuses (code, description, is_login_allowed)
VALUES
  ('active', 'Account is active and can authenticate.', TRUE),
  ('pending_verification', 'Account exists but email verification is pending.', TRUE),
  ('suspended', 'Account is temporarily suspended.', FALSE),
  ('disabled', 'Account is permanently or administratively disabled.', FALSE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth.users (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  username TEXT NULL,
  status_code TEXT NOT NULL DEFAULT 'pending_verification',
  email_verified_at TIMESTAMPTZ NULL,
  profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ NULL,
  last_login_ip INET NULL,
  last_login_user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_public_id_unique UNIQUE (public_id),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase_trimmed_check CHECK (email = lower(trim(email))),
  CONSTRAINT users_email_format_check CHECK (email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'),
  CONSTRAINT users_username_format_check CHECK (
    username IS NULL OR username ~ '^[a-zA-Z0-9_\-\.]{3,32}$'
  ),
  CONSTRAINT users_status_code_fk
    FOREIGN KEY (status_code)
    REFERENCES auth.account_statuses (code)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
  ON auth.users (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_status_code_idx
  ON auth.users (status_code);

CREATE INDEX IF NOT EXISTS users_last_login_at_idx
  ON auth.users (last_login_at DESC)
  WHERE last_login_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth.user_profiles (
  user_id BIGINT PRIMARY KEY,
  display_name TEXT NULL,
  avatar_url TEXT NULL,
  bio TEXT NULL,
  timezone TEXT NULL,
  locale TEXT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_profiles_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT user_profiles_display_name_length_check CHECK (
    display_name IS NULL OR char_length(trim(display_name)) BETWEEN 2 AND 80
  ),
  CONSTRAINT user_profiles_bio_length_check CHECK (
    bio IS NULL OR char_length(bio) <= 512
  ),
  CONSTRAINT user_profiles_timezone_length_check CHECK (
    timezone IS NULL OR char_length(trim(timezone)) BETWEEN 1 AND 80
  ),
  CONSTRAINT user_profiles_locale_format_check CHECK (
    locale IS NULL OR locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'
  )
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT NULL,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_authenticated_at TIMESTAMPTZ NULL,
  CONSTRAINT identities_public_id_unique UNIQUE (public_id),
  CONSTRAINT identities_provider_provider_user_unique UNIQUE (provider, provider_user_id),
  CONSTRAINT identities_user_provider_unique UNIQUE (user_id, provider),
  CONSTRAINT identities_provider_format_check CHECK (provider ~ '^[a-z][a-z0-9_\-\.]{1,63}$'),
  CONSTRAINT identities_provider_user_id_length_check CHECK (char_length(trim(provider_user_id)) BETWEEN 1 AND 255),
  CONSTRAINT identities_provider_email_format_check CHECK (
    provider_email IS NULL OR provider_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  CONSTRAINT identities_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS identities_user_id_idx
  ON auth.identities (user_id);

CREATE INDEX IF NOT EXISTS identities_provider_idx
  ON auth.identities (provider);

CREATE TABLE IF NOT EXISTS auth.password_credentials (
  user_id BIGINT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_algorithm TEXT NOT NULL DEFAULT 'argon2id',
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_login_at TIMESTAMPTZ NULL,
  locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT password_credentials_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT password_credentials_hash_length_check CHECK (char_length(password_hash) >= 40),
  CONSTRAINT password_credentials_algorithm_check CHECK (
    password_algorithm IN ('argon2id', 'bcrypt', 'scrypt', 'pbkdf2')
  ),
  CONSTRAINT password_credentials_failed_attempts_check CHECK (failed_login_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS password_credentials_locked_until_idx
  ON auth.password_credentials (locked_until)
  WHERE locked_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  invalidated_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_verification_tokens_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT email_verification_tokens_hash_unique UNIQUE (token_hash),
  CONSTRAINT email_verification_tokens_email_format_check CHECK (
    email = lower(trim(email))
    AND email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  CONSTRAINT email_verification_tokens_expires_after_create_check CHECK (expires_at > created_at),
  CONSTRAINT email_verification_tokens_terminal_state_check CHECK (
    NOT (verified_at IS NOT NULL AND invalidated_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS email_verification_tokens_active_per_user_email_uk
  ON auth.email_verification_tokens (user_id, email)
  WHERE verified_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS email_verification_tokens_lookup_idx
  ON auth.email_verification_tokens (token_hash, expires_at)
  WHERE verified_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_idx
  ON auth.email_verification_tokens (expires_at);

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  invalidated_at TIMESTAMPTZ NULL,
  requested_ip INET NULL,
  requested_user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT password_reset_tokens_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash),
  CONSTRAINT password_reset_tokens_expires_after_create_check CHECK (expires_at > created_at),
  CONSTRAINT password_reset_tokens_terminal_state_check CHECK (
    NOT (used_at IS NOT NULL AND invalidated_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_active_per_user_uk
  ON auth.password_reset_tokens (user_id)
  WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_tokens_lookup_idx
  ON auth.password_reset_tokens (token_hash, expires_at)
  WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_idx
  ON auth.password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  identity_id BIGINT NULL,
  session_secret_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  revoked_reason TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_public_id_unique UNIQUE (public_id),
  CONSTRAINT sessions_secret_hash_unique UNIQUE (session_secret_hash),
  CONSTRAINT sessions_expires_after_create_check CHECK (expires_at > created_at),
  CONSTRAINT sessions_last_activity_after_create_check CHECK (last_activity_at >= created_at),
  CONSTRAINT sessions_revoked_at_after_create_check CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  ),
  CONSTRAINT sessions_user_fk
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  CONSTRAINT sessions_identity_fk
    FOREIGN KEY (identity_id)
    REFERENCES auth.identities (id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON auth.sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_identity_id_idx
  ON auth.sessions (identity_id)
  WHERE identity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sessions_active_lookup_idx
  ON auth.sessions (user_id, last_activity_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON auth.sessions (expires_at);

CREATE TABLE IF NOT EXISTS audit.auth_events (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_user_id BIGINT NULL,
  target_user_id BIGINT NULL,
  identity_id BIGINT NULL,
  session_id BIGINT NULL,
  is_success BOOLEAN NOT NULL DEFAULT TRUE,
  failure_code TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_events_public_id_unique UNIQUE (public_id),
  CONSTRAINT auth_events_event_type_format_check CHECK (
    event_type ~ '^[a-z][a-z0-9_\.]{2,80}$'
  ),
  CONSTRAINT auth_events_actor_user_fk
    FOREIGN KEY (actor_user_id)
    REFERENCES auth.users (id)
    ON DELETE SET NULL,
  CONSTRAINT auth_events_target_user_fk
    FOREIGN KEY (target_user_id)
    REFERENCES auth.users (id)
    ON DELETE SET NULL,
  CONSTRAINT auth_events_identity_fk
    FOREIGN KEY (identity_id)
    REFERENCES auth.identities (id)
    ON DELETE SET NULL,
  CONSTRAINT auth_events_session_fk
    FOREIGN KEY (session_id)
    REFERENCES auth.sessions (id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS auth_events_target_user_occurred_idx
  ON audit.auth_events (target_user_id, occurred_at DESC)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS auth_events_event_type_occurred_idx
  ON audit.auth_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS auth_events_session_occurred_idx
  ON audit.auth_events (session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_setting TEXT;
BEGIN
  v_setting := current_setting('request.user_id', TRUE);

  IF v_setting IS NULL OR btrim(v_setting) = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_setting::BIGINT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    lower(current_setting('request.is_service_role', TRUE)) IN ('1', 'true', 't', 'yes', 'on'),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION auth.prevent_email_verification_reuse()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'email verification token has already been consumed';
  END IF;

  IF OLD.invalidated_at IS NOT NULL THEN
    RAISE EXCEPTION 'email verification token has already been invalidated';
  END IF;

  IF OLD.expires_at <= NOW() AND NEW.verified_at IS DISTINCT FROM OLD.verified_at AND NEW.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'email verification token has expired';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auth.prevent_password_reset_reuse()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'password reset token has already been consumed';
  END IF;

  IF OLD.invalidated_at IS NOT NULL THEN
    RAISE EXCEPTION 'password reset token has already been invalidated';
  END IF;

  IF OLD.expires_at <= NOW() AND NEW.used_at IS DISTINCT FROM OLD.used_at AND NEW.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'password reset token has expired';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auth.purge_expired_auth_artifacts(
  p_revoked_session_retention INTERVAL DEFAULT INTERVAL '30 days'
)
RETURNS TABLE (
  deleted_sessions BIGINT,
  deleted_email_verification_tokens BIGINT,
  deleted_password_reset_tokens BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_sessions BIGINT := 0;
  v_deleted_email_tokens BIGINT := 0;
  v_deleted_reset_tokens BIGINT := 0;
BEGIN
  DELETE FROM auth.sessions
  WHERE expires_at < NOW()
     OR (
       revoked_at IS NOT NULL
       AND revoked_at < NOW() - p_revoked_session_retention
     );
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  DELETE FROM auth.email_verification_tokens
  WHERE expires_at < NOW()
     OR verified_at IS NOT NULL
     OR invalidated_at IS NOT NULL;
  GET DIAGNOSTICS v_deleted_email_tokens = ROW_COUNT;

  DELETE FROM auth.password_reset_tokens
  WHERE expires_at < NOW()
     OR used_at IS NOT NULL
     OR invalidated_at IS NOT NULL;
  GET DIAGNOSTICS v_deleted_reset_tokens = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_sessions, v_deleted_email_tokens, v_deleted_reset_tokens;
END;
$$;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON auth.user_profiles
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_identities_updated_at
BEFORE UPDATE ON auth.identities
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_password_credentials_updated_at
BEFORE UPDATE ON auth.password_credentials
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_email_verification_single_use
BEFORE UPDATE ON auth.email_verification_tokens
FOR EACH ROW
WHEN (
  NEW.verified_at IS DISTINCT FROM OLD.verified_at
  OR NEW.invalidated_at IS DISTINCT FROM OLD.invalidated_at
)
EXECUTE FUNCTION auth.prevent_email_verification_reuse();

CREATE TRIGGER trg_password_reset_single_use
BEFORE UPDATE ON auth.password_reset_tokens
FOR EACH ROW
WHEN (
  NEW.used_at IS DISTINCT FROM OLD.used_at
  OR NEW.invalidated_at IS DISTINCT FROM OLD.invalidated_at
)
EXECUTE FUNCTION auth.prevent_password_reset_reuse();

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.password_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.password_credentials FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.email_verification_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.password_reset_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE audit.auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.auth_events FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select_own_or_service
  ON auth.users
  FOR SELECT
  USING (auth.is_service_role() OR id = auth.current_user_id());

CREATE POLICY users_update_own_or_service
  ON auth.users
  FOR UPDATE
  USING (auth.is_service_role() OR id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR id = auth.current_user_id());

CREATE POLICY users_insert_service_only
  ON auth.users
  FOR INSERT
  WITH CHECK (auth.is_service_role());

CREATE POLICY users_delete_service_only
  ON auth.users
  FOR DELETE
  USING (auth.is_service_role());

CREATE POLICY user_profiles_select_own_or_service
  ON auth.user_profiles
  FOR SELECT
  USING (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY user_profiles_mutate_own_or_service
  ON auth.user_profiles
  FOR ALL
  USING (auth.is_service_role() OR user_id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY identities_select_own_or_service
  ON auth.identities
  FOR SELECT
  USING (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY identities_mutate_own_or_service
  ON auth.identities
  FOR ALL
  USING (auth.is_service_role() OR user_id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY sessions_select_own_or_service
  ON auth.sessions
  FOR SELECT
  USING (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY sessions_mutate_own_or_service
  ON auth.sessions
  FOR ALL
  USING (auth.is_service_role() OR user_id = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR user_id = auth.current_user_id());

CREATE POLICY password_credentials_service_only
  ON auth.password_credentials
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY email_verification_tokens_service_only
  ON auth.email_verification_tokens
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY password_reset_tokens_service_only
  ON auth.password_reset_tokens
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_events_select_own_or_service
  ON audit.auth_events
  FOR SELECT
  USING (
    auth.is_service_role()
    OR actor_user_id = auth.current_user_id()
    OR target_user_id = auth.current_user_id()
  );

CREATE POLICY auth_events_insert_service_only
  ON audit.auth_events
  FOR INSERT
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_events_update_service_only
  ON audit.auth_events
  FOR UPDATE
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_events_delete_service_only
  ON audit.auth_events
  FOR DELETE
  USING (auth.is_service_role());

COMMENT ON INDEX auth.users_status_code_idx IS 'Supports frequent account status checks during authentication.';
COMMENT ON INDEX auth.identities_provider_idx IS 'Supports provider-based identity lookups during login.';
COMMENT ON INDEX auth.sessions_active_lookup_idx IS 'Supports active-session lookup and logout-all operations by user.';
COMMENT ON INDEX auth.sessions_expires_at_idx IS 'Supports scheduled cleanup and expiration filtering.';
COMMENT ON INDEX auth.email_verification_tokens_lookup_idx IS 'Supports secure token verification lookup by hash + expiry.';
COMMENT ON INDEX auth.password_reset_tokens_lookup_idx IS 'Supports secure password reset token lookup by hash + expiry.';
COMMENT ON INDEX audit.auth_events_event_type_occurred_idx IS 'Supports security analytics by auth event type and recency.';

COMMIT;
