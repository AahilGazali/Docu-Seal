# Email Setup Guide for DocuSeal

## Resend (Recommended for Render/Production)

Gmail SMTP often fails on cloud hosts like Render. Use **Resend** instead:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to Render Environment Variables:
   - `RESEND_API_KEY` = `re_xxxxxxxx`
   - `FRONTEND_URL` = `https://docu-seal.netlify.app`
4. Redeploy

Emails will send from `onboarding@resend.dev` by default. To use your own domain, add and verify it in Resend, then set `EMAIL_FROM_EMAIL=noreply@yourdomain.com`.

---

## Using Gmail with Nodemailer (Local Dev)

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other (Custom name)" as the device
4. Enter "DocuSeal" as the name
5. Click "Generate"
6. Copy the 16-character password (you'll need this for your .env file)

### Step 3: Configure Environment Variables

Add these to your `Backend/.env` file:

```env
# Email Configuration (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM_NAME=DocuSeal

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

### Step 4: Alternative Email Services

If you prefer not to use Gmail, you can use other SMTP services:

#### SendGrid
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-username
EMAIL_PASSWORD=your-mailgun-password
```

#### Custom SMTP
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
EMAIL_SECURE=false  # true for port 465, false for port 587
```

### Step 5: Test Email Configuration

After setting up, restart your backend server. You should see:
```
[Email Config] Email service ready
```

If you see an error, check:
1. Email credentials are correct
2. App password is valid (for Gmail)
3. SMTP settings are correct (for other services)

## Important Notes

- **Gmail Limitations**: Gmail is not recommended for production. It has daily sending limits and may block suspicious activity.
- **Production**: For production, use a dedicated email service like SendGrid, Mailgun, or AWS SES.
- **Security**: Never commit your `.env` file with real credentials to version control.
