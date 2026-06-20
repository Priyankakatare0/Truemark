-- =============================================================================
-- 001_init.sql — TrueMark initial schema
-- Run in Supabase SQL Editor before 002_rls_policies.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Fingerprints: ownership records with CLIP embeddings
CREATE TABLE IF NOT EXISTS fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    phash TEXT NOT NULL,
    clip_vector VECTOR(512) NOT NULL,
    owner_label TEXT,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fingerprints_file_hash ON fingerprints (file_hash);
CREATE INDEX IF NOT EXISTS idx_fingerprints_created_at ON fingerprints (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fingerprints_is_sample ON fingerprints (is_sample);

-- IVFFlat index for vector similarity (requires some rows to be effective)
CREATE INDEX IF NOT EXISTS idx_fingerprints_clip_vector
ON fingerprints USING ivfflat (clip_vector vector_cosine_ops)
WITH (lists = 100);

-- Reports: similarity check results
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint_id UUID NOT NULL REFERENCES fingerprints(id) ON DELETE CASCADE,
    originality_score NUMERIC(5,2) NOT NULL CHECK (originality_score >= 0 AND originality_score <= 100),
    top_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_fingerprint_id ON reports (fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);

-- pgvector cosine similarity search RPC
CREATE OR REPLACE FUNCTION match_fingerprints(
    query_embedding VECTOR(512),
    match_threshold FLOAT DEFAULT -1.0,
    match_count INT DEFAULT 5,
    exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    fingerprint_id UUID,
    file_name TEXT,
    similarity_score FLOAT,
    is_sample BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id AS fingerprint_id,
        f.file_name,
        (1 - (f.clip_vector <=> query_embedding))::FLOAT AS similarity_score,
        f.is_sample
    FROM fingerprints f
    WHERE (exclude_id IS NULL OR f.id != exclude_id)
      AND (1 - (f.clip_vector <=> query_embedding)) >= match_threshold
    ORDER BY f.clip_vector <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Storage bucket for PDF reports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;
