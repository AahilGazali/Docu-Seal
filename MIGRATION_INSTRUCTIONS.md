# Database Migration Required

## ⚠️ IMPORTANT: Run This Migration First

The Settings page requires database columns that don't exist yet. You **MUST** run this migration before the settings will work.

## Steps to Fix:

1. **Open your Supabase project dashboard**
2. **Go to SQL Editor** (left sidebar)
3. **Click "New query"**
4. **Copy and paste this SQL:**

```sql
-- Migration: Add user preferences columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
```

5. **Click "Run"** (or press Ctrl+Enter)

## Verify Migration:

After running the migration, you can verify it worked by running:

```bash
cd Backend
node check-migration.js
```

This will check if the columns exist and provide helpful feedback.

## What This Does:

- Adds `language` column (defaults to 'en' for English)
- Adds `theme` column (defaults to 'light', can be 'light' or 'dark')
- Both columns are optional and have defaults, so existing users won't be affected

## After Migration:

Once the migration is complete:
- ✅ Name changes will save successfully
- ✅ Language selection will work and persist
- ✅ Dark/Light mode toggle will work and persist
- ✅ All settings will sync across devices
