-- =============================================================================
-- 002_rls_policies.sql
-- 
-- CONTEXT: The backend .env has SUPABASE_SERVICE_ROLE set to the anon key
-- (a common misconfiguration). The service_role key bypasses RLS automatically,
-- but the anon key is subject to RLS policies.
--
-- This migration adds permissive RLS policies for the anon role so the backend
-- can INSERT/SELECT/UPDATE fingerprints and reports until the correct
-- service_role key is configured.
--
-- IMPORTANT: Once you set the real service_role key in .env, you can remove
-- these policies (or keep them for additional access control flexibility).
-- =============================================================================

-- Enable RLS on both tables (safe to run even if already enabled)
ALTER TABLE fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================
-- Fingerprints policies
-- =====================

-- Allow backend (anon role) to insert new fingerprints
CREATE POLICY IF NOT EXISTS "allow_anon_insert_fingerprints"
ON fingerprints
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow backend (anon role) to select all fingerprints (needed for similarity search)
CREATE POLICY IF NOT EXISTS "allow_anon_select_fingerprints"
ON fingerprints
FOR SELECT
TO anon
USING (true);

-- Allow backend (anon role) to update fingerprints (not currently needed but safe to add)
CREATE POLICY IF NOT EXISTS "allow_anon_update_fingerprints"
ON fingerprints
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- =================
-- Reports policies
-- =================

-- Allow backend (anon role) to insert new reports
CREATE POLICY IF NOT EXISTS "allow_anon_insert_reports"
ON reports
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow backend (anon role) to select all reports
CREATE POLICY IF NOT EXISTS "allow_anon_select_reports"
ON reports
FOR SELECT
TO anon
USING (true);

-- Allow backend (anon role) to update reports (needed for pdf_url update)
CREATE POLICY IF NOT EXISTS "allow_anon_update_reports"
ON reports
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- ==============================================
-- Storage: Create the reports bucket if missing
-- ==============================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or Management API.
-- Run this in the Supabase SQL Editor if the bucket doesn't exist:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('reports', 'reports', false)
-- ON CONFLICT (id) DO NOTHING;

-- Allow anon role to insert into storage.objects (for PDF uploads)
CREATE POLICY IF NOT EXISTS "allow_anon_storage_insert"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'reports');

-- Allow anon role to select from storage.objects (for signed URL generation)
CREATE POLICY IF NOT EXISTS "allow_anon_storage_select"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'reports');

-- Allow anon role to update storage.objects (for x-upsert support)
CREATE POLICY IF NOT EXISTS "allow_anon_storage_update"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'reports');
