BEGIN;

CREATE SCHEMA IF NOT EXISTS billing;

-- Billing Customers
CREATE TABLE IF NOT EXISTS billing.billing_customers (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_customers_public_id_uk UNIQUE (public_id),
  CONSTRAINT billing_customers_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

-- Project Quotas & Expansions
CREATE TABLE IF NOT EXISTS billing.project_quotas (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  expansion_packs INTEGER NOT NULL DEFAULT 0,
  database_storage_bytes BIGINT NOT NULL DEFAULT 26843545600, -- 25 GB default
  file_storage_bytes BIGINT NOT NULL DEFAULT 26843545600,     -- 25 GB default
  bandwidth_bytes BIGINT NOT NULL DEFAULT 26843545600,        -- 25 GB default
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_quotas_public_id_uk UNIQUE (public_id),
  CONSTRAINT project_quotas_project_uk UNIQUE (project_id),
  CONSTRAINT project_quotas_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

-- Billing Checkout Sessions
CREATE TABLE IF NOT EXISTS billing.billing_checkout_sessions (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  stripe_session_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 100, -- $1.00 USD
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkout_sessions_public_id_uk UNIQUE (public_id),
  CONSTRAINT checkout_sessions_stripe_session_uk UNIQUE (stripe_session_id),
  CONSTRAINT checkout_sessions_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

-- Billing Payments & Transactions
CREATE TABLE IF NOT EXISTS billing.billing_payments (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  stripe_payment_id TEXT NOT NULL,
  stripe_session_id TEXT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 100,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'succeeded',
  expansion_packs_granted INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_payments_public_id_uk UNIQUE (public_id),
  CONSTRAINT billing_payments_stripe_payment_uk UNIQUE (stripe_payment_id),
  CONSTRAINT billing_payments_project_fk FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE
);

-- Billing Webhook Events for Idempotency
CREATE TABLE IF NOT EXISTS billing.billing_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_webhook_events_public_id_uk UNIQUE (public_id),
  CONSTRAINT billing_webhook_events_stripe_event_uk UNIQUE (stripe_event_id)
);

COMMIT;
