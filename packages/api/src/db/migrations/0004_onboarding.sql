-- Migration: 0004_onboarding
-- Description: Add onboarding_completed flag to organizations

ALTER TABLE organizations ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

-- Also add google_id and name to users if not exists (for OAuth users)
-- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we'll catch the error
