-- Migration: 0002_integrations
-- Description: Add integrations table for provider connections

-- Integrations (extends provider_connections with status and sync tracking)
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'aws-sns')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'connected', 'error')),
  credentials TEXT, -- Encrypted JSON
  connected_at TEXT,
  last_sync_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
