const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { sendPasswordResetEmail } = require('../config/email');
const { ApiError } = require('../utils/ApiError');

const RESET_TOKEN_EXPIRY_HOURS = 1;

const SALT_ROUNDS = 12;
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
}

async function register(name, email, password) {
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email and password are required');
  }

  const existing = await supabase.from('users').select('id').eq('email', email).single();
  if (existing.data) {
    throw new ApiError(409, 'Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const id = uuidv4();

    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        name,
        email,
        password: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString(),
        language: 'en',
        theme: 'light',
      })
      .select('id, name, email, role, created_at, language, theme')
      .single();

  if (error) {
    console.error('Supabase register error:', error);
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      throw new ApiError(503, 'Database not set up. Run the SQL in Backend/supabase-schema.sql in your Supabase SQL editor.');
    }
    throw new ApiError(500, error.message || 'Registration failed');
  }

  const accessToken = jwt.sign(
    { sub: data.id, email: data.email, role: data.role },
    accessSecret,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { sub: data.id },
    refreshSecret,
    { expiresIn: REFRESH_EXPIRY }
  );

  return { user: data, accessToken, refreshToken };
}

async function login(email, password) {
  try {
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    console.log(`[Auth Login] Attempting login for email: ${email}`);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, role, created_at, language, theme')
      .eq('email', email)
      .single();

    if (error) {
      console.error(`[Auth Login] Database error:`, error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new ApiError(503, 'Database not set up. Run the SQL in Backend/supabase-schema.sql in your Supabase SQL editor.');
      }
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user) {
      console.log(`[Auth Login] User not found for email: ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`[Auth Login] Invalid password for email: ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if 2FA is enabled (column may not exist if migration not run)
    let totpEnabled = false;
    const { data: prefs, error: prefsError } = await supabase
      .from('users')
      .select('totp_enabled')
      .eq('id', user.id)
      .single();
    if (!prefsError && prefs) {
      totpEnabled = !!prefs.totp_enabled;
    }

    if (totpEnabled) {
      const tempToken = jwt.sign(
        { sub: user.id, purpose: '2fa_pending' },
        accessSecret,
        { expiresIn: '2m' }
      );
      return {
        requires2FA: true,
        tempToken,
        email: user.email,
      };
    }

    const { password: _, ...safeUser } = user;
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      accessSecret,
      { expiresIn: ACCESS_EXPIRY }
    );
    const refreshToken = jwt.sign(
      { sub: user.id },
      refreshSecret,
      { expiresIn: REFRESH_EXPIRY }
    );

    console.log(`[Auth Login] Successfully logged in user: ${user.email}`);
    return { user: safeUser, accessToken, refreshToken };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error(`[Auth Login] Unexpected error:`, err);
    throw new ApiError(500, `Login failed: ${err.message || 'Unknown error'}`);
  }
}

async function refresh(refreshToken) {
  try {
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token required');
    }

    const decoded = jwt.verify(refreshToken, refreshSecret);
    console.log(`[Auth Refresh] Refreshing token for user: ${decoded.sub}`);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, language, theme')
      .eq('id', decoded.sub)
      .single();

    if (error) {
      console.error(`[Auth Refresh] Database error:`, error);
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new ApiError(503, 'Database not set up. Run the SQL in Backend/supabase-schema.sql in your Supabase SQL editor.');
      }
      throw new ApiError(401, 'User not found');
    }

    if (!user) {
      console.log(`[Auth Refresh] User not found: ${decoded.sub}`);
      throw new ApiError(401, 'User not found');
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      accessSecret,
      { expiresIn: ACCESS_EXPIRY }
    );
    const newRefreshToken = jwt.sign(
      { sub: user.id },
      refreshSecret,
      { expiresIn: REFRESH_EXPIRY }
    );

    console.log(`[Auth Refresh] Successfully refreshed token for user: ${user.email}`);
    return { user, accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
    console.error(`[Auth Refresh] Unexpected error:`, err);
    throw new ApiError(500, `Token refresh failed: ${err.message || 'Unknown error'}`);
  }
}

async function updateProfile(userId, updates) {
  try {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    // Always allow name update, conditionally allow language and theme
    const updateData = {};
    
    // Name is always allowed
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    // Check if language and theme columns exist by trying to select them
    let hasLanguageColumn = false;
    let hasThemeColumn = false;
    
    // Try to select just the id first, then try with language/theme
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('id, language, theme')
      .eq('id', userId)
      .single();
    
    // If query succeeds without column errors, columns exist
    if (!testError && testUser) {
      hasLanguageColumn = 'language' in testUser;
      hasThemeColumn = 'theme' in testUser;
    } else if (testError) {
      // Check if error is due to missing columns (PostgreSQL error code 42703)
      if (testError.code === '42703') {
        // Columns don't exist - that's okay, we'll skip updating them
        console.log('[Auth UpdateProfile] language/theme columns do not exist. Only name will be updated.');
      } else {
        // Some other error occurred
        console.warn('[Auth UpdateProfile] Error checking columns:', testError.message);
      }
    }

    if (updates.language !== undefined) {
      if (hasLanguageColumn) {
        updateData.language = updates.language;
      } else {
        console.warn('[Auth UpdateProfile] language column does not exist. Run migration: Backend/migrations/add-user-preferences.sql');
        // Still try to update language - if column doesn't exist, Supabase will error and we'll handle it
        updateData.language = updates.language;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'No valid fields to update');
    }

    console.log(`[Auth UpdateProfile] Updating user ${userId} with:`, updateData);

    // Build select query - try to include language if we're updating it, otherwise just basic fields
    let selectFields = 'id, name, email, role, created_at';
    // Only try to select language/theme if we know they exist OR if we're updating them (let Supabase error if they don't exist)
    if (updateData.language !== undefined) {
      selectFields += ', language';
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(selectFields)
      .single();

    if (error) {
      console.error(`[Auth UpdateProfile] Database error:`, error);
      // PostgreSQL error code 42703 = undefined_column
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        const missingColumns = [];
        if (updates.language !== undefined && !hasLanguageColumn) missingColumns.push('language');
        if (updates.theme !== undefined && !hasThemeColumn) missingColumns.push('theme');
        
        if (missingColumns.length > 0) {
          throw new ApiError(503, `Database columns missing: ${missingColumns.join(', ')}. Please run the migration SQL in Backend/migrations/add-user-preferences.sql in your Supabase SQL editor.`);
        }
        throw new ApiError(503, 'Database schema issue. Please run the migration SQL in Backend/migrations/add-user-preferences.sql in your Supabase SQL editor.');
      }
      // If updating name only and columns don't exist, that's fine - just update name
      if (Object.keys(updateData).length === 1 && updateData.name) {
        // Name update should work even without language/theme columns
        // This shouldn't happen, but handle gracefully
      }
      throw new ApiError(500, error.message || 'Failed to update profile');
    }

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    // Ensure language is set to default if column doesn't exist
    if (!hasLanguageColumn && !updatedUser.language) {
      updatedUser.language = 'en';
    }

    console.log(`[Auth UpdateProfile] Successfully updated user: ${updatedUser.email}`);
    return updatedUser;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error(`[Auth UpdateProfile] Unexpected error:`, err);
    throw new ApiError(500, `Profile update failed: ${err.message || 'Unknown error'}`);
  }
}

async function forgotPassword(email) {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', email.toLowerCase().trim())
    .single();

  // Always return success to avoid email enumeration
  if (error || !user) {
    console.log(`[Auth ForgotPassword] No user found for: ${email}`);
    return { success: true, message: 'If an account exists with that email, you will receive a password reset link.' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  const { error: insertError } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error('[Auth ForgotPassword] Failed to create token:', insertError);
    if (insertError.code === '42P01') {
      throw new ApiError(503, 'Password reset is not available. Run the migration in Backend/migrations/add-password-reset-tokens.sql in your Supabase SQL editor.');
    }
    throw new ApiError(500, 'Failed to process request');
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
  } catch (emailErr) {
    console.error('[Auth ForgotPassword] Failed to send email:', emailErr);
    throw new ApiError(500, 'Failed to send reset email. Please try again or contact support.');
  }

  return { success: true, message: 'If an account exists with that email, you will receive a password reset link.' };
}

async function resetPassword(token, newPassword) {
  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const { data: resetRecord, error } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token.trim())
    .single();

  if (error || !resetRecord) {
    throw new ApiError(400, 'Invalid or expired reset link. Please request a new one.');
  }

  if (resetRecord.used_at) {
    throw new ApiError(400, 'This reset link has already been used. Please request a new one.');
  }

  const expiresAt = new Date(resetRecord.expires_at);
  if (expiresAt < new Date()) {
    throw new ApiError(400, 'This reset link has expired. Please request a new one.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', resetRecord.user_id);

  if (updateError) {
    console.error('[Auth ResetPassword] Failed to update password:', updateError);
    throw new ApiError(500, 'Failed to reset password');
  }

  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', resetRecord.id);

  return { success: true, message: 'Password has been reset successfully. You can now sign in.' };
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!userId || !currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, password')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new ApiError(404, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', userId);

  if (updateError) {
    throw new ApiError(500, 'Failed to update password');
  }

  return { success: true, message: 'Password changed successfully' };
}

async function setup2FA(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, totp_enabled')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.totp_enabled) {
    throw new ApiError(400, '2FA is already enabled');
  }

  const secret = speakeasy.generateSecret({
    name: `DocuSeal (${user.email})`,
    length: 20,
  });

  const { error: updateError } = await supabase
    .from('users')
    .update({ totp_secret: secret.base32 })
    .eq('id', userId);

  if (updateError) {
    if (updateError.message?.includes('column')) {
      throw new ApiError(503, '2FA not available. Run Backend/migrations/add-2fa-columns.sql in Supabase SQL Editor.');
    }
    throw new ApiError(500, 'Failed to setup 2FA');
  }

  const otpauthUrl = secret.otpauth_url;
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 });
  } catch (qrErr) {
    console.warn('[2FA Setup] QR generation failed:', qrErr);
  }

  return {
    secret: secret.base32,
    qrDataUrl,
    message: 'Scan the QR code with your authenticator app, then verify with a code.',
  };
}

async function verify2FA(userId, token) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, totp_secret, totp_enabled')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.totp_secret) {
    throw new ApiError(400, '2FA setup not started. Please start setup first.');
  }

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: token.replace(/\s/g, ''),
    window: 1,
  });

  if (!valid) {
    throw new ApiError(400, 'Invalid verification code');
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ totp_enabled: true })
    .eq('id', userId);

  if (updateError) {
    throw new ApiError(500, 'Failed to enable 2FA');
  }

  return { success: true, message: '2FA enabled successfully' };
}

async function disable2FA(userId, password) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, password, totp_enabled')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.totp_enabled) {
    throw new ApiError(400, '2FA is not enabled');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new ApiError(400, 'Password is incorrect');
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ totp_enabled: false, totp_secret: null })
    .eq('id', userId);

  if (updateError) {
    throw new ApiError(500, 'Failed to disable 2FA');
  }

  return { success: true, message: '2FA disabled successfully' };
}

async function complete2FALogin(tempToken, code) {
  let decoded;
  try {
    decoded = jwt.verify(tempToken, accessSecret);
    if (decoded.purpose !== '2fa_pending') {
      throw new ApiError(400, 'Invalid token');
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(400, 'Session expired. Please log in again.');
    }
    throw new ApiError(400, 'Invalid or expired token. Please log in again.');
  }

  const userId = decoded.sub;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, role, created_at, language, theme, totp_secret, totp_enabled')
    .eq('id', userId)
    .single();

  if (error || !user || !user.totp_enabled || !user.totp_secret) {
    throw new ApiError(401, 'Invalid session. Please log in again.');
  }

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: (code || '').replace(/\s/g, ''),
    window: 1,
  });

  if (!valid) {
    throw new ApiError(400, 'Invalid verification code');
  }

  const { totp_secret: _, totp_enabled: __, ...safeUser } = user;
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    accessSecret,
    { expiresIn: ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { sub: user.id },
    refreshSecret,
    { expiresIn: REFRESH_EXPIRY }
  );

  return { user: safeUser, accessToken, refreshToken };
}

async function get2FAStatus(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('totp_enabled')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { enabled: false };
  }

  return { enabled: !!(user.totp_enabled === true || user.totp_enabled === 'true') };
}

module.exports = {
  register,
  login,
  refresh,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  complete2FALogin,
  get2FAStatus,
};
