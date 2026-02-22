-- Add label column to signatures table to store full name or initials per signature
ALTER TABLE public.signatures 
ADD COLUMN IF NOT EXISTS label TEXT;

-- Set default label for existing signatures (can be updated later)
UPDATE public.signatures 
SET label = NULL 
WHERE label IS NULL;
