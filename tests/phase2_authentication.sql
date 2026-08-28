-- Phase 2 SQL validation scenarios
-- Run after applying 0001 + 0002 up migrations.

BEGIN;

-- Service-role context for controlled setup.
SET LOCAL request.is_service_role = 'true';
SET LOCAL request.user_id = '';

-- USER: create user
INSERT INTO auth.users (email, username, status_code)
VALUES ('alice@example.com', 'alice_user', 'active');

INSERT INTO auth.users (email, username, status_code)
VALUES ('bob@example.com', 'bob_user', 'suspended');

DO $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM auth.users WHERE email = 'alice@example.com';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one alice@example.com user, got %', v_count;
  END IF;
END;
$$;

-- USER: duplicate email rejected
DO $$
BEGIN
  BEGIN
    INSERT INTO auth.users (email, username) VALUES ('alice@example.com', 'alice_dup');
    RAISE EXCEPTION 'duplicate email was not rejected';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END;
$$;

-- USER: invalid user data rejected (invalid email)
DO $$
BEGIN
  BEGIN
    INSERT INTO auth.users (email, username) VALUES ('not-an-email', 'bad_email_user');
    RAISE EXCEPTION 'invalid email was not rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

-- PROFILE
INSERT INTO auth.user_profiles (user_id, display_name, locale, timezone)
SELECT id, 'Alice', 'en-US', 'UTC'
FROM auth.users
WHERE email = 'alice@example.com';

-- AUTH IDENTITY
INSERT INTO auth.identities (user_id, provider, provider_user_id, provider_email, is_primary)
SELECT id, 'password', 'alice@example.com', 'alice@example.com', true
FROM auth.users
WHERE email = 'alice@example.com';

-- PASSWORD: hashing constraint and credential insert
DO $$
BEGIN
  BEGIN
    INSERT INTO auth.password_credentials (user_id, password_hash)
    SELECT id, 'too_short_hash'
    FROM auth.users
    WHERE email = 'alice@example.com';
    RAISE EXCEPTION 'short password hash was not rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

INSERT INTO auth.password_credentials (user_id, password_hash)
SELECT id, repeat('a', 80)
FROM auth.users
WHERE email = 'alice@example.com';

-- AUTHENTICATION: inactive account detection capability
DO $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  SELECT s.is_login_allowed INTO v_allowed
  FROM auth.users u
  JOIN auth.account_statuses s ON s.code = u.status_code
  WHERE u.email = 'bob@example.com';

  IF v_allowed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION 'suspended account should not be login-allowed';
  END IF;
END;
$$;

-- SESSIONS: creation
INSERT INTO auth.sessions (user_id, identity_id, session_secret_hash, expires_at)
SELECT u.id, i.id, repeat('b', 96), NOW() + INTERVAL '1 day'
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'alice@example.com';

-- SESSIONS: invalid expiration rejected
DO $$
DECLARE
  v_user_id BIGINT;
  v_identity_id BIGINT;
BEGIN
  SELECT u.id, i.id INTO v_user_id, v_identity_id
  FROM auth.users u
  JOIN auth.identities i ON i.user_id = u.id
  WHERE u.email = 'alice@example.com';

  BEGIN
    INSERT INTO auth.sessions (user_id, identity_id, session_secret_hash, expires_at)
    VALUES (v_user_id, v_identity_id, repeat('c', 96), NOW() - INTERVAL '1 minute');
    RAISE EXCEPTION 'expired-at-create session was not rejected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

-- SESSIONS: revocation (logout)
UPDATE auth.sessions
SET revoked_at = NOW(), revoked_reason = 'logout'
WHERE session_secret_hash = repeat('b', 96);

DO $$
DECLARE
  v_revoked_at TIMESTAMPTZ;
BEGIN
  SELECT revoked_at INTO v_revoked_at
  FROM auth.sessions
  WHERE session_secret_hash = repeat('b', 96);

  IF v_revoked_at IS NULL THEN
    RAISE EXCEPTION 'session revocation was not applied';
  END IF;
END;
$$;

-- SESSIONS: logout-all support
INSERT INTO auth.sessions (user_id, identity_id, session_secret_hash, expires_at)
SELECT u.id, i.id, repeat('d', 96), NOW() + INTERVAL '1 day'
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'alice@example.com';

UPDATE auth.sessions
SET revoked_at = NOW(), revoked_reason = 'logout_all'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alice@example.com')
  AND revoked_at IS NULL;

DO $$
DECLARE
  v_active_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM auth.sessions
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alice@example.com')
    AND revoked_at IS NULL
    AND expires_at > NOW();

  IF v_active_count <> 0 THEN
    RAISE EXCEPTION 'logout-all did not revoke all active sessions';
  END IF;
END;
$$;

-- EMAIL: verification creation + successful verification
INSERT INTO auth.email_verification_tokens (user_id, email, token_hash, expires_at)
SELECT id, email, repeat('e', 96), NOW() + INTERVAL '1 hour'
FROM auth.users
WHERE email = 'alice@example.com';

UPDATE auth.email_verification_tokens
SET verified_at = NOW()
WHERE token_hash = repeat('e', 96);

-- EMAIL: reused verification rejected
DO $$
BEGIN
  BEGIN
    UPDATE auth.email_verification_tokens
    SET verified_at = NOW() + INTERVAL '1 minute'
    WHERE token_hash = repeat('e', 96);
    RAISE EXCEPTION 'reused verification token was not rejected';
  EXCEPTION WHEN raise_exception THEN
    NULL;
  END;
END;
$$;

-- EMAIL: expired verification rejected
INSERT INTO auth.email_verification_tokens (user_id, email, token_hash, created_at, expires_at)
SELECT id, email, repeat('f', 96), NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'
FROM auth.users
WHERE email = 'alice@example.com';

DO $$
BEGIN
  BEGIN
    UPDATE auth.email_verification_tokens
    SET verified_at = NOW()
    WHERE token_hash = repeat('f', 96);
    RAISE EXCEPTION 'expired verification token was not rejected';
  EXCEPTION WHEN raise_exception THEN
    NULL;
  END;
END;
$$;

-- PASSWORD RESET: request + successful use
INSERT INTO auth.password_reset_tokens (user_id, token_hash, expires_at)
SELECT id, repeat('g', 96), NOW() + INTERVAL '30 minutes'
FROM auth.users
WHERE email = 'alice@example.com';

UPDATE auth.password_reset_tokens
SET used_at = NOW()
WHERE token_hash = repeat('g', 96);

-- PASSWORD RESET: reused reset token rejected
DO $$
BEGIN
  BEGIN
    UPDATE auth.password_reset_tokens
    SET used_at = NOW() + INTERVAL '1 minute'
    WHERE token_hash = repeat('g', 96);
    RAISE EXCEPTION 'reused reset token was not rejected';
  EXCEPTION WHEN raise_exception THEN
    NULL;
  END;
END;
$$;

-- PASSWORD RESET: expired reset token rejected
INSERT INTO auth.password_reset_tokens (user_id, token_hash, created_at, expires_at)
SELECT id, repeat('h', 96), NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'
FROM auth.users
WHERE email = 'alice@example.com';

DO $$
BEGIN
  BEGIN
    UPDATE auth.password_reset_tokens
    SET used_at = NOW()
    WHERE token_hash = repeat('h', 96);
    RAISE EXCEPTION 'expired reset token was not rejected';
  EXCEPTION WHEN raise_exception THEN
    NULL;
  END;
END;
$$;

-- PASSWORD: password change metadata
UPDATE auth.password_credentials
SET password_hash = repeat('z', 81), password_changed_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alice@example.com');

DO $$
DECLARE
  v_hash_len INT;
BEGIN
  SELECT char_length(password_hash) INTO v_hash_len
  FROM auth.password_credentials
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alice@example.com');

  IF v_hash_len < 40 THEN
    RAISE EXCEPTION 'password change produced invalid hash length';
  END IF;
END;
$$;

-- AUDIT: event insert without secrets
INSERT INTO audit.auth_events (event_type, actor_user_id, target_user_id, is_success, event_metadata)
SELECT 'auth.login.success', id, id, true, '{"method":"password"}'::jsonb
FROM auth.users
WHERE email = 'alice@example.com';

-- SECURITY: user cannot read another user's private profile/session under RLS context
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vcoredb_phase2_tester') THEN
    CREATE ROLE vcoredb_phase2_tester;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA auth TO vcoredb_phase2_tester;
GRANT USAGE ON SCHEMA audit TO vcoredb_phase2_tester;
GRANT SELECT ON auth.user_profiles TO vcoredb_phase2_tester;
GRANT SELECT ON auth.sessions TO vcoredb_phase2_tester;
GRANT SELECT ON auth.password_credentials TO vcoredb_phase2_tester;

SET ROLE vcoredb_phase2_tester;
SET LOCAL request.is_service_role = 'false';
SELECT set_config('request.user_id', (SELECT id::TEXT FROM auth.users WHERE email = 'alice@example.com'), true);

DO $$
DECLARE
  v_other_profiles BIGINT;
  v_other_sessions BIGINT;
  v_secret_rows BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_other_profiles
  FROM auth.user_profiles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bob@example.com');

  IF v_other_profiles <> 0 THEN
    RAISE EXCEPTION 'unauthorized profile access is possible';
  END IF;

  SELECT COUNT(*) INTO v_other_sessions
  FROM auth.sessions
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bob@example.com');

  IF v_other_sessions <> 0 THEN
    RAISE EXCEPTION 'unauthorized session access is possible';
  END IF;

  SELECT COUNT(*) INTO v_secret_rows
  FROM auth.password_credentials;

  IF v_secret_rows <> 0 THEN
    RAISE EXCEPTION 'secret-bearing table is visible to non-service actor';
  END IF;
END;
$$;

ROLLBACK;
