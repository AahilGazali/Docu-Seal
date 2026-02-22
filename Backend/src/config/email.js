const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('[Email Config] Email service not configured:', error.message);
    console.warn('[Email Config] Email sending will fail. Please configure EMAIL_USER and EMAIL_PASSWORD in .env');
  } else {
    console.log('[Email Config] Email service ready');
  }
});

async function sendSigningInvitation({ to, name, documentTitle, signingUrl, ownerName }) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'DocuSeal'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Sign Document: ${documentTitle}`,
    html: `
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
          .button:hover { background: #5568d3; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Document Signing Request</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p><strong>${ownerName}</strong> has requested that you sign the following document:</p>
            <h2 style="color: #667eea;">${documentTitle}</h2>
            <p>Please click the button below to review and sign the document:</p>
            <div style="text-align: center;">
              <a href="${signingUrl}" class="button">Sign Document</a>
            </div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${signingUrl}" style="color: #667eea; word-break: break-all;">${signingUrl}</a>
            </p>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              This link will expire in 7 days. If you have any questions, please contact the document owner.
            </p>
          </div>
          <div class="footer">
            <p>This email was sent by DocuSeal - Secure Document Signing</p>
            <p>If you did not expect this email, please ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${name},

${ownerName} has requested that you sign the following document: ${documentTitle}

Please visit the following link to review and sign:
${signingUrl}

This link will expire in 7 days.

If you have any questions, please contact the document owner.

---
DocuSeal - Secure Document Signing
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Signing invitation sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send invitation to ${to}:`, error);
    throw error;
  }
}

async function sendSigningReminder({ to, name, documentTitle, signingUrl, ownerName }) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'DocuSeal'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Reminder: Sign Document - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Reminder: Document Signing</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>This is a reminder that <strong>${ownerName}</strong> is still waiting for you to sign:</p>
            <h2 style="color: #f59e0b;">${documentTitle}</h2>
            <div style="text-align: center;">
              <a href="${signingUrl}" class="button">Sign Document Now</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send reminder to ${to}:`, error);
    throw error;
  }
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'DocuSeal'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset Your DocuSeal Password',
    html: `
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
      </html>
    `,
    text: `
Hello ${name || 'there'},

We received a request to reset your DocuSeal password. Visit the link below to create a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request this, please ignore this email.

DocuSeal - Secure Document Signing
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
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
