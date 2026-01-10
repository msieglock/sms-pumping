-- Migration: 0003_sms_messages
-- Description: Add SMS messages table for raw provider data storage (forever retention)

-- SMS Messages - stores raw message data from all providers
CREATE TABLE IF NOT EXISTS sms_messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'aws-sns')),

  -- Provider's message ID (for deduplication)
  provider_message_id TEXT NOT NULL,

  -- Message details
  direction TEXT NOT NULL CHECK(direction IN ('outbound', 'inbound')),
  status TEXT NOT NULL, -- sent, delivered, failed, etc. (varies by provider)
  from_number TEXT,
  to_number TEXT NOT NULL,

  -- Content (optional - some orgs may want to store message body)
  body TEXT,

  -- Cost/Pricing info
  price REAL,
  price_unit TEXT DEFAULT 'USD',

  -- Raw provider data stored as JSON for future analysis
  raw_data TEXT NOT NULL,

  -- Fraud detection linkage
  check_id TEXT REFERENCES sms_checks(id),

  -- Timestamps from provider
  sent_at TEXT,
  delivered_at TEXT,

  -- Our timestamps
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(org_id, provider, provider_message_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_id ON sms_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider ON sms_messages(provider);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_messages_check_id ON sms_messages(check_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);

-- Provider webhook deliveries - track incoming webhook data from SMS providers for debugging/replay
CREATE TABLE IF NOT EXISTS provider_webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'aws-sns')),

  -- Webhook metadata
  event_type TEXT NOT NULL, -- message.status, delivery.report, etc.
  raw_payload TEXT NOT NULL, -- Full webhook payload as JSON
  signature TEXT, -- Provider signature for validation

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  process_error TEXT,

  -- Timestamps
  received_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_provider_webhooks_org_provider ON provider_webhooks(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_provider_webhooks_processed ON provider_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_provider_webhooks_received_at ON provider_webhooks(received_at);
