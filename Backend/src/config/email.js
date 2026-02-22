const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Prefer Resend over Gmail when RESEND_API_KEY is set (Gmail SMTP fails on Render)
const resendKey = (process.env.RESEND_API_KEY || '').trim();
const useResend = resendKey.length > 0 && resendKey.startsWith('re_');
const resend = useResend ? new Resend(resendKey) : null;

// Nodemailer config - use port 587 (STARTTLS) for better cloud compatibility (Gmail blocks port 465 on some hosts)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function getFromAddress() {
  if (useResend) {
    const fromEmail = process.env.EMAIL_FROM_EMAIL || 'onboarding@resend.dev';
    return `${process.env.EMAIL_FROM_NAME || 'DocuSeal'} <${fromEmail}>`;
  }
  return `"${process.env.EMAIL_FROM_NAME || 'DocuSeal'}" <${process.env.EMAIL_USER}>`;
}

// Verify configuration on startup
if (useResend) {
  console.log('[Email Config] Using Resend (API key detected)');
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter.verify((error) => {
    if (error) {
      console.error('[Email Config] SMTP verify failed:', error.message);
      console.warn('[Email Config] Tip: Gmail often fails on cloud hosts (Render, etc). Use Resend instead: set RESEND_API_KEY. See EMAIL_SETUP.md');
    } else {
      console.log('[Email Config] SMTP ready');
    }
  });
} else {
  console.warn('[Email Config] No email configured. Set EMAIL_USER + EMAIL_PASSWORD (Gmail) or RESEND_API_KEY (recommended for production)');
}

async function sendSigningInvitation({ to, name, documentTitle, signingUrl, ownerName }) {
  if (!useResend && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
    throw new Error('Email not configured. Set RESEND_API_KEY (recommended) or EMAIL_USER + EMAIL_PASSWORD. Redeploy after adding.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>📝 Document Signing Request</h1></div>
        <div class="content">
          <p>Hello ${name},</p>
          <p><strong>${ownerName}</strong> has requested that you sign: <strong>${documentTitle}</strong></p>
          <p><a href="${signingUrl}" class="button">Sign Document</a></p>
          <p style="color:#666;font-size:14px;">Or copy this link: <a href="${signingUrl}" style="color:#667eea;word-break:break-all;">${signingUrl}</a></p>
          <p style="color:#666;font-size:12px;">Link expires in 7 days.</p>
        </div>
        <div class="footer"><p>DocuSeal - Secure Document Signing</p></div>
      </div>
    </body>
    </html>`;
  const text = `Hello ${name},\n\n${ownerName} has requested that you sign: ${documentTitle}\n\nSign here: ${signingUrl}\n\nLink expires in 7 days.\n\n---\nDocuSeal`;

  try {
    if (useResend && resend) {
      const { data, error } = await resend.emails.send({
        from: getFromAddress(),
        to,
        subject: `Sign Document: ${documentTitle}`,
        html,
      });
      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      console.log(`[Email] Signing invitation sent to ${to}:`, data?.id);
      return { success: true, messageId: data?.id };
    }
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Sign Document: ${documentTitle}`,
      html,
      text,
    });
    console.log(`[Email] Signing invitation sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send invitation to ${to}:`, error);
    throw error;
  }
}

async function sendSigningReminder({ to, name, documentTitle, signingUrl, ownerName }) {
  const html = `<!DOCTYPE html><html><body style="font-family:Arial">
    <p>Hello ${name},</p>
    <p>Reminder: <strong>${ownerName}</strong> is waiting for you to sign: <strong>${documentTitle}</strong></p>
    <p><a href="${signingUrl}" style="display:inline-block;padding:12px 30px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;">Sign Document Now</a></p>
  </body></html>`;
  try {
    if (useResend && resend) {
      const { data, error } = await resend.emails.send({
        from: getFromAddress(),
        to,
        subject: `Reminder: Sign Document - ${documentTitle}`,
        html,
      });
      if (error) throw new Error(error.message);
      return { success: true, messageId: data?.id };
    }
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Reminder: Sign Document - ${documentTitle}`,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send reminder to ${to}:`, error);
    throw error;
  }
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #0d9488; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello ${name || 'there'},</p>
            <p>We received a request to reset your DocuSeal password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #0d9488; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="margin-top: 20px; color: #94a3b8; font-size: 12px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>DocuSeal - Secure Document Signing</p>
          </div>
        </div>
      </body>
      </html>`;

  try {
    if (useResend && resend) {
      const { data, error } = await resend.emails.send({
        from: getFromAddress(),
        to,
        subject: 'Reset Your DocuSeal Password',
        html,
      });
      if (error) throw new Error(error.message);
      return { success: true, messageId: data?.id };
    }
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: 'Reset Your DocuSeal Password',
      html,
    });
    console.log(`[Email] Password reset email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send password reset to ${to}:`, error);
    throw error;
  }
}

module.exports = {
  transporter,
  sendSigningInvitation,
  sendSigningReminder,
  sendPasswordResetEmail,
};
