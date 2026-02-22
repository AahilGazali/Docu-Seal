-- Run this in your Supabase project: SQL Editor → New query → paste and run.
-- Adds TOTP 2FA support to users table.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
