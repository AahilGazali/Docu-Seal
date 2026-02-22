-- Migration: Add user preferences columns
-- Run this in your Supabase project: SQL Editor → New query → paste and run.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
