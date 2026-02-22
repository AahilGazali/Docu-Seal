-- Add deleted_at column to documents table for soft delete
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for faster queries of non-deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NULL;
