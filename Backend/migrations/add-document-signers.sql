-- Migration: Add document_signers table for multi-signer support
-- Run this in your Supabase project: SQL Editor → New query → paste and run.

-- Document Signers: Tracks who needs to sign each document
CREATE TABLE IF NOT EXISTS public.document_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'signer' CHECK (role IN ('signer', 'viewer', 'cc')),
  signing_order INTEGER, -- NULL = no order required, number = order (1, 2, 3...)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected')),
  signer_token TEXT UNIQUE, -- Unique token for email-based signing
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_signers_document_id ON public.document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_token ON public.document_signers(signer_token);
CREATE INDEX IF NOT EXISTS idx_document_signers_email ON public.document_signers(email);

-- Update documents table to support signing order
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS requires_signing_order BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
