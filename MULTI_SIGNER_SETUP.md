# Multi-Signer Email Invitation Setup Guide

## Overview
This feature allows you to add multiple people to sign documents via email invitations, similar to iLovePDF and Smallpdf.

## Setup Steps

### 1. Database Migration
Run this SQL in your Supabase SQL Editor:

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

### 2. Install Nodemailer
```bash
cd Backend
npm install nodemailer
```

### 3. Configure Email Settings

Add to `Backend/.env`:

```env
# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM_NAME=DocuSeal

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

**For Gmail:**
1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password in `EMAIL_PASSWORD`

### 4. Restart Backend Server
```bash
cd Backend
npm start
```

## How It Works

### Adding Signers
1. Open a document in ViewDocument
2. Click "Add Signers" button
3. Fill in name, email, and role for each signer
4. Optionally enable signing order (sequential signing)
5. Optionally set expiration date
6. Click "Send Invitations"

### Email Invitations
- Each signer receives a personalized email
- Email contains a unique signing link with token
- Link format: `http://localhost:3000/sign/{documentId}?token={unique-token}`

### Signing Process
1. Signer clicks link in email
2. System verifies token and shows document
3. Signer can accept or reject
4. Status is updated in database
5. Document owner can track signing progress

### Signing Order
- If enabled, signers must sign in order (1, 2, 3...)
- Next signer only receives notification after previous signer completes
- Prevents out-of-order signing

## API Endpoints

### Add Signers
```
POST /api/signers/add
Body: {
  documentId: string,
  signers: [{ name, email, role, signing_order? }],
  requiresOrder: boolean,
  expiresAt: string | null
}
```

### Get Signers
```
GET /api/signers/document/:documentId
```

### Verify Token (Public)
```
GET /api/signers/verify?documentId=xxx&token=xxx
```

### Update Signer Status (Public)
```
PUT /api/signers/:signerId/status
Body: { status: 'signed' | 'rejected' | 'viewed' }
```

## Features

✅ Add multiple signers via email
✅ Sequential signing order support
✅ Expiration dates
✅ Email invitations with beautiful HTML templates
✅ Token-based secure signing links
✅ Track signing status (pending, sent, viewed, signed, rejected)
✅ Support for signers, viewers, and CC recipients
✅ IP address tracking
✅ Automatic status updates

## Testing

1. Add signers to a document
2. Check your email inbox (or check console logs if email not configured)
3. Click the signing link
4. Accept or reject the document
5. Check the signer status in the database

## Troubleshooting

**Email not sending:**
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Verify Gmail App Password is correct
- Check backend console for email errors

**Token verification fails:**
- Ensure token is in URL: `?token=xxx`
- Check token hasn't expired
- Verify document hasn't expired

**Signing order issues:**
- Ensure previous signers have completed
- Check signing_order values in database
