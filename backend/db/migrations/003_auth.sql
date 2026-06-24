-- =============================================================================
-- 003_auth.sql — TrueMark User Authentication Schema
-- Run in Supabase SQL Editor after 002_rls_policies.sql
-- =============================================================================

-- Users table: stores registered accounts
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    reports      INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);

-- Trigger: auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add user_id FK to fingerprints (nullable — sample/legacy rows have no user)
ALTER TABLE fingerprints
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON fingerprints (user_id);

-- Add user_id FK to reports (nullable for backward compat)
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports (user_id);

-- =============================================================================
-- Helper RPC: atomically increment a user's report counter
-- Called by the backend after each successful similarity check.
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_user_reports(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users SET reports = reports + 1 WHERE id = p_user_id;
END;
$$;

