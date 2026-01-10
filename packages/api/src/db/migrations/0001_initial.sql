-- Migration: 0001_initial
-- Description: Initial database schema for SMSGuard

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK(plan IN ('trial', 'pro')),
  trial_ends_at TEXT,
  avg_sms_cost REAL DEFAULT 0.08,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'analyst', 'readonly')),
  mfa_enabled INTEGER DEFAULT 0,
  mfa_secret TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('test', 'live')),
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- SMS Checks
CREATE TABLE IF NOT EXISTS sms_checks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_country TEXT,
  phone_carrier TEXT,
  phone_type TEXT,
  ip_address TEXT,
  ip_country TEXT,
  user_agent TEXT,
  session_id TEXT,
  fraud_score INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('allow', 'block', 'review')),
  signals TEXT NOT NULL,
  metadata TEXT,
  sms_sent INTEGER DEFAULT 0,
  code_verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_checks_org_id ON sms_checks(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_checks_created_at ON sms_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_checks_phone_country ON sms_checks(phone_country);
CREATE INDEX IF NOT EXISTS idx_sms_checks_decision ON sms_checks(decision);
CREATE INDEX IF NOT EXISTS idx_sms_checks_org_created ON sms_checks(org_id, created_at);

-- Geo Rules
CREATE TABLE IF NOT EXISTS geo_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('allow', 'block')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, country_code)
);

-- Velocity Limits
CREATE TABLE IF NOT EXISTS velocity_limits (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK(dimension IN ('ip', 'phone_prefix', 'account')),
  window_minutes INTEGER NOT NULL,
  max_requests INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, dimension, window_minutes)
);

-- AI Reviews
CREATE TABLE IF NOT EXISTS ai_reviews (
  id TEXT PRIMARY KEY,
  check_id TEXT NOT NULL REFERENCES sms_checks(id) ON DELETE CASCADE,
  recommendation TEXT NOT NULL CHECK(recommendation IN ('allow', 'deny')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
  reasoning TEXT NOT NULL,
  human_override TEXT CHECK(human_override IN ('allow', 'deny')),
  overridden_by TEXT REFERENCES users(id),
  overridden_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Provider Connections
CREATE TABLE IF NOT EXISTS provider_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'bandwidth')),
  credentials TEXT NOT NULL,
  connected_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, provider)
);

-- Historical Analyses
CREATE TABLE IF NOT EXISTS historical_analyses (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  total_sms INTEGER NOT NULL,
  suspected_fraud INTEGER NOT NULL,
  estimated_fraud_cost REAL NOT NULL,
  top_fraud_countries TEXT NOT NULL,
  analysis_period_start TEXT NOT NULL,
  analysis_period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Country Risk Data
CREATE TABLE IF NOT EXISTS country_risk (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  risk_tier TEXT NOT NULL CHECK(risk_tier IN ('low', 'medium', 'high')),
  base_score INTEGER NOT NULL,
  fraud_rate REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Carrier Risk Data
CREATE TABLE IF NOT EXISTS carrier_risk (
  id TEXT PRIMARY KEY,
  carrier_name TEXT NOT NULL,
  country_code TEXT,
  risk_score INTEGER NOT NULL DEFAULT 50,
  fraud_rate REAL DEFAULT 0,
  delivery_rate REAL DEFAULT 0.95,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed country risk data
INSERT OR IGNORE INTO country_risk (code, name, risk_tier, base_score) VALUES
  ('US', 'United States', 'low', 10),
  ('CA', 'Canada', 'low', 10),
  ('GB', 'United Kingdom', 'low', 10),
  ('DE', 'Germany', 'low', 10),
  ('FR', 'France', 'low', 10),
  ('JP', 'Japan', 'low', 10),
  ('AU', 'Australia', 'low', 10),
  ('BR', 'Brazil', 'medium', 40),
  ('IN', 'India', 'medium', 40),
  ('MX', 'Mexico', 'medium', 40),
  ('TH', 'Thailand', 'medium', 40),
  ('VN', 'Vietnam', 'medium', 40),
  ('ID', 'Indonesia', 'high', 70),
  ('PH', 'Philippines', 'high', 70),
  ('NG', 'Nigeria', 'high', 70),
  ('PK', 'Pakistan', 'high', 70);
