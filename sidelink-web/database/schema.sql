-- SideLink Verification Sessions Schema (PostgreSQL / Supabase / Neon)
-- Run this migration in your Supabase SQL Editor or Neon Database Console

CREATE TABLE IF NOT EXISTS verification_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    challenge_nonce VARCHAR(64) NOT NULL,
    client_ip VARCHAR(45),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'verified', 'expired', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_verification_sessions_status ON verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_expires_at ON verification_sessions(expires_at);

COMMENT ON TABLE verification_sessions IS 'Stores single-use launch authorization sessions for SideLink Windows client';
