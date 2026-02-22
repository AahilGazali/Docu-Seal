# Complete Setup Guide - Multi-Signer Email Feature

## 🎯 Step-by-Step Instructions

### Step 1: Generate Gmail App Password ✅ (You're here!)

1. **On the Google App Passwords page:**
   - Type "DocuSeal" (or any name you prefer) in the "App name" field
   - Click "Create" button
   - **IMPORTANT:** Copy the 16-character password that appears (it looks like: `abcd efgh ijkl mnop`)
   - Save it somewhere safe - you'll need it in Step 3

### Step 2: Run Database Migration

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

2. **Copy and paste this SQL:**

```sql
-- Migration: Add document_signers table for multi-signer support
CREATE TABLE IF NOT EXISTS public.document_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'signer' CHECK (role IN ('signer', 'viewer', 'cc')),
  signing_order INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected')),
  signer_token TEXT UNIQUE,
  signed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_signers_document_id ON public.document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signers_token ON public.document_signers(signer_token);
CREATE INDEX IF NOT EXISTS idx_document_signers_email ON public.document_signers(email);

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS requires_signing_order BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
```

3. **Click "Run"** (or press Ctrl+Enter)
4. You should see: "Success. No rows returned"

### Step 3: Configure Email in Backend

1. **Open `Backend/.env` file**
2. **Add these lines** (replace with your actual values):

```env
# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password-here
EMAIL_FROM_NAME=DocuSeal

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

**Example:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=aahilgazali102@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM_NAME=DocuSeal
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password-here` with the password from Step 1
- Remove spaces from the app password (or keep them, both work)
- Make sure `FRONTEND_URL` matches your frontend dev server port (usually 3000)

### Step 4: Install Nodemailer

1. **Open terminal in the Backend folder:**
   ```bash
   cd Backend
   npm install nodemailer
   ```

2. **Wait for installation to complete**

### Step 5: Restart Backend Server

1. **Stop your backend server** (if running) - Press `Ctrl+C`
2. **Start it again:**
   ```bash
   npm start
   ```
   or
   ```bash
   npm run dev
   ```

3. **Look for this message:**
   ```
   [Email Config] Email service ready
   ```
   
   If you see an error, check:
   - Email credentials in `.env` are correct
   - App password is valid
   - No typos in email or password

### Step 6: Test the Feature

1. **Start your frontend** (if not running):
   ```bash
   cd Frontend
   npm run dev
   ```

2. **Open your app** in browser: `http://localhost:3000`

3. **Login** to your account

4. **Open a document** (or upload a new one)

5. **Click "Add Signers"** button (next to "Place signature")

6. **Fill in signer details:**
   - Name: Test User
   - Email: Your email (to test)
   - Role: Signer

7. **Click "Send Invitations"**

8. **Check your email inbox** - You should receive a signing invitation!

9. **Click the link in the email** - It should open the document for signing

## ✅ Verification Checklist

- [ ] Gmail App Password generated
- [ ] Database migration run successfully
- [ ] Email credentials added to `Backend/.env`
- [ ] Nodemailer installed (`npm install` completed)
- [ ] Backend restarted and shows "Email service ready"
- [ ] Frontend running
- [ ] "Add Signers" button visible on document page
- [ ] Can add signers and send invitations
- [ ] Email received with signing link
- [ ] Signing link works

## 🐛 Troubleshooting

### Email not sending?
- Check `Backend/.env` has correct `EMAIL_USER` and `EMAIL_PASSWORD`
- Verify App Password is correct (16 characters, no extra spaces)
- Check backend console for email errors
- Make sure backend server restarted after adding `.env` values

### "Email service not configured" error?
- Check `.env` file exists in `Backend/` folder
- Verify environment variables are set correctly
- Restart backend server

### Database errors?
- Make sure migration SQL ran successfully
- Check Supabase dashboard → Table Editor → `document_signers` table exists

### "Add Signers" button not showing?
- Make sure you're viewing a document (not dashboard)
- Check browser console for errors
- Refresh the page

## 📧 Email Template Preview

The email sent to signers includes:
- Professional HTML design
- Document title
- Owner name
- Big "Sign Document" button
- Direct signing link
- Expiration notice

## 🎉 You're Done!

Once all steps are complete, you can:
- Add multiple signers to any document
- Send email invitations automatically
- Track signing status
- Enable sequential signing order
- Set expiration dates

Need help? Check the console logs for detailed error messages!
