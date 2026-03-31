-- Add expires_at to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at DATE;
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents (expires_at);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  26214400, -- 25MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: tenant path = documents/{tenant_id}/...
-- SELECT: tenant members can read their files
CREATE POLICY "tenant_documents_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ANY (
      SELECT id::text FROM tenants
      WHERE id = ANY (public.my_tenant_ids())
    )
  );

-- INSERT: tenant members can upload to their folder
CREATE POLICY "tenant_documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ANY (
      SELECT id::text FROM tenants
      WHERE id = ANY (public.my_tenant_ids())
    )
  );

-- DELETE: tenant members can delete their files
CREATE POLICY "tenant_documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = ANY (
      SELECT id::text FROM tenants
      WHERE id = ANY (public.my_tenant_ids())
    )
  );
