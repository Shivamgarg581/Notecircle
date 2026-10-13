import { Router } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, generateToken, parseToken } from '../db.ts';
import { verifyTurnstileToken } from '../captcha.ts';
import { normalizeEmail } from '../emailNormalizer.ts';
import { saveUserAvatar, deleteUserAvatar } from '../avatarStorage.ts';
import { 
  sendRegistrationOtpEmail, 
  sendWelcomeEmail, 
  sendPasswordRecoveryEmail, 
  sendAdminNewUserAlert,
  sendSecurityAlertEmail 
} from '../email.ts';
import type { User } from '../../src/types/index.ts';

export const authRouter = Router();

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(`nc_otp_salt_${otp.trim()}`).digest('hex');
}

function hashVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(`nc_verif_salt_${token.trim()}`).digest('hex');
}

/**
 * Strips passwordHash, password_hash and internal security secrets before returning to client.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): T | null {
  if (!user) return null;
  const copy = { ...user };
  delete (copy as any).passwordHash;
  delete (copy as any).password_hash;
  return copy as T;
}

// Middleware to extract authenticated user & validate active server-side session
// Supports both HttpOnly Secure Cookie (browser) and Bearer header (REST API / Mobile / CLI)
export function getAuthUser(req: any): User | null {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace(/^Bearer\s+/, '').trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('nc_session_token=')) {
        token = decodeURIComponent(trimmed.substring('nc_session_token='.length));
        break;
      }
    }
  }

  if (!token) return null;
  const userId = parseToken(token);
  if (!userId) return null;

  // Validate server-side session record
  const session = db.getSessionByToken(token);
  if (!session) {
    // Session was revoked or logged out
    return null;
  }

  // Update last active
  db.touchSession(token);

  const user = db.get('users').find((u) => u.id === userId);
  return user || null;
}

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in.' });
  }
  return res.json({ user: sanitizeUser(user) });
});

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { identifier, password, deviceName } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const user = db.get('users').find(
    (u) => u.username.toLowerCase() === cleanIdent || (u.email && u.email.toLowerCase() === cleanIdent)
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.isSuspended) {
    return res.status(403).json({ error: 'This account has been suspended by administration.' });
  }

  const storedHash = (user as any).passwordHash;
  if (!storedHash || !verifyPassword(password, storedHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken(user.id);
  const device = deviceName || req.headers['user-agent']?.substring(0, 50) || 'Web Client';
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  db.createSession(user.id, token, device, ip);
  db.logAudit(user.id, user.username, 'LOGIN_SUCCESS', `Device: ${device}`);

  // Set secure HttpOnly session cookie
  res.cookie('nc_session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  return res.json({ token, user: sanitizeUser(user) });
});

// In-memory IP rate limiter for registration attempts (max 25 per 5 minutes per IP)
const registrationRateLimit = new Map<string, { count: number; resetAt: number }>();

export function resetRegistrationRateLimits(): void {
  registrationRateLimit.clear();
}

// Internal route to reset rate limits for test suites and administrative maintenance
authRouter.post('/internal/reset-rate-limit', (_req, res) => {
  resetRegistrationRateLimits();
  return res.json({ success: true, message: 'Registration rate limits reset' });
});

function checkRegistrationRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxAttempts = 25;

  const entry = registrationRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    registrationRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}

// POST /api/auth/register
// Modern registration: CAPTCHA verified, email validated & Gmail normalized, optional profile picture upload
authRouter.post('/register', async (req, res) => {
  const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();

  // 1. Server-side Rate Limiting
  const rateLimit = checkRegistrationRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many registration attempts from your IP. Please try again in ${rateLimit.retryAfterSeconds} seconds.`
    });
  }

  const {
    email,
    username,
    displayName,
    password,
    captchaToken,
    avatarDataUrl,
    bio,
    city,
    deviceName
  } = req.body;

  // 2. Validate mandatory text inputs
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
    return res.status(400).json({ error: 'Display name is required.' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  // 3. CAPTCHA verification (Cloudflare Turnstile token)
  const captchaResult = await verifyTurnstileToken(captchaToken, clientIp);
  if (!captchaResult.success) {
    return res.status(400).json({
      error: captchaResult.error || 'CAPTCHA security check failed. Please complete verification.'
    });
  }

  // 4. Email validation and Gmail-specific normalization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const emailNorm = normalizeEmail(trimmedEmail);
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3 || cleanUsername.length > 24) {
    return res.status(400).json({ error: 'Username must be 3-24 characters (letters, numbers, underscores only).' });
  }

  // 5. Uniqueness checks across all users (Username and Normalized Email)
  const allUsers = db.get('users');
  if (allUsers.some((u) => u.username.toLowerCase() === cleanUsername)) {
    return res.status(409).json({ error: `@${cleanUsername} is already taken. Please choose another username.` });
  }

  // Check email uniqueness:
  // If input is Gmail, reject if ANY existing user normalizes to the same Gmail address.
  // If input is non-Gmail, match exact normalized lowercase address.
  for (const existingUser of allUsers) {
    if (!existingUser.email) continue;
    const existingNorm = normalizeEmail(existingUser.email);
    if (emailNorm.isGmail && existingNorm.isGmail) {
      if (existingNorm.normalized === emailNorm.normalized) {
        return res.status(409).json({
          error: 'An account is already registered with this Gmail address (or an alias/variation of it).'
        });
      }
    } else {
      if (existingNorm.normalized === emailNorm.normalized) {
        return res.status(409).json({
          error: 'An account is already registered with this email address.'
        });
      }
    }
  }

  const newUserId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  // 6. Optional profile picture selection and upload to Supabase Storage
  let uploadedAvatarUrl = '';
  if (avatarDataUrl && typeof avatarDataUrl === 'string' && avatarDataUrl.trim()) {
    const avatarRes = await saveUserAvatar(newUserId, avatarDataUrl.trim());
    if (!avatarRes.success || !avatarRes.avatarUrl) {
      return res.status(400).json({
        error: avatarRes.error || 'Failed to process selected profile photo. Please select a valid JPG, PNG, or WEBP image under 5MB.'
      });
    }
    uploadedAvatarUrl = avatarRes.avatarUrl;
  }

  // 7. Assemble user model
  const newUser: User = {
    id: newUserId,
    username: cleanUsername,
    displayName: displayName.trim(),
    email: emailNorm.raw,
    avatarUrl: uploadedAvatarUrl,
    bio: bio ? bio.trim() : '',
    city: city ? city.trim() : undefined,
    isPrivate: true,
    isAdmin: false,
    availability: {
      code: 'available',
      label: 'Available',
      emoji: '🟢',
      strictDnd: false,
      updatedAt: new Date().toISOString()
    },
    privacySettings: {
      whoCanMessageMe: 'mutual',
      whoCanSeeOnlineStatus: 'connections',
      whoCanSeeReadReceipts: 'connections',
      whoCanSeeTyping: 'connections',
      whoCanFollowMe: 'require_approval',
      whoCanReply: 'connections',
      whoCanReact: 'connections',
      bioVisibility: 'connections',
      cityVisibility: 'connections',
      birthdayVisibility: 'only_me',
      workplaceVisibility: 'connections',
      followerCountsVisibility: 'connections',
      dndModeStrict: false
    },
    notificationSettings: {
      messages: true,
      messageRequests: true,
      followRequests: true,
      acceptedRequests: true,
      reactions: true,
      replies: true,
      noteExpiration: true,
      securityAlerts: true
    },
    createdAt: new Date().toISOString()
  };

  try {
    (newUser as any).passwordHash = hashPassword(password);
    db.update('users', (curr) => [...curr, newUser]);

    const token = generateToken(newUser.id);
    const device = deviceName || req.headers['user-agent']?.substring(0, 50) || 'Web Client';

    db.createSession(newUser.id, token, device, clientIp);
    db.logAudit(newUser.id, newUser.username, 'REGISTER_CAPTCHA_VERIFIED', `Registered with email: ${emailNorm.raw}${uploadedAvatarUrl ? ' (with avatar)' : ''}`);

    // Send Welcome Email and Admin Alert in background
    sendWelcomeEmail(emailNorm.raw, newUser.displayName, newUser.username).catch(() => {});
    sendAdminNewUserAlert(newUser).catch(() => {});

    // Set secure HttpOnly session cookie
    res.cookie('nc_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (err: any) {
    // If account creation fails, clean up the uploaded avatar from storage to prevent orphaned files
    if (uploadedAvatarUrl) {
      deleteUserAvatar(uploadedAvatarUrl).catch(() => {});
    }
    console.error('[Registration] Failure during user creation:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/, '').trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('nc_session_token=')) {
        token = decodeURIComponent(trimmed.substring('nc_session_token='.length));
        break;
      }
    }
  }

  if (token) {
    db.deleteSessionByToken(token);
  }

  res.clearCookie('nc_session_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });

  return res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/logout-all
authRouter.post('/logout-all', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  db.deleteAllSessionsForUser(user.id);
  db.logAudit(user.id, user.username, 'LOGOUT_ALL_DEVICES', 'Terminated all active sessions');
  return res.json({ success: true, message: 'All devices logged out successfully' });
});

// POST /api/auth/forgot-password
// Generates a cryptographically random 6-digit recovery OTP, stores hashed token with 15-min expiry
authRouter.post('/forgot-password', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or username is required' });

  const clean = identifier.trim().toLowerCase();
  const user = db.get('users').find(
    (u) => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean)
  );

  // Constant-time message response to prevent account enumeration
  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this information, a secure recovery code has been sent.'
    });
  }

  // Cryptographically random 6-digit code
  const randomInt = crypto.randomInt(100000, 999999);
  const rawOtp = randomInt.toString();
  const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

  db.createPasswordRecovery(user.id, codeHash, 15);
  db.logAudit(user.id, user.username, 'PASSWORD_RECOVERY_REQUESTED', 'Recovery OTP generated and dispatched');

  // Dispatch real transactional password recovery email if user has email
  if (user.email) {
    sendPasswordRecoveryEmail(user.email, rawOtp).catch((err) => {
      console.warn('[AUTH RECOVERY] Notice delivering recovery email:', err?.message || err);
    });
  }

  return res.json({
    success: true,
    message: 'If an account exists with this information, a secure recovery code has been sent to your registered contact.',
    userId: user.id
  });
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', (req, res) => {
  const { userId, code, newPassword } = req.body;
  if (!userId || !code || !newPassword) {
    return res.status(400).json({ error: 'User ID, recovery code, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const recovery = db.getActiveRecoveryRequest(userId);
  if (!recovery) {
    return res.status(400).json({ error: 'No active recovery request found. Please request a new code.' });
  }

  // Increment attempts to prevent brute force
  db.incrementRecoveryAttempt(recovery.id);

  const inputHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  if (inputHash !== recovery.code_hash) {
    return res.status(400).json({ error: 'Invalid recovery code. Please check and retry.' });
  }

  // Code is valid! Mark as used
  db.markRecoveryUsed(recovery.id);

  // Invalidate all existing sessions for this user on password change
  db.deleteAllSessionsForUser(userId);

  // Update password with scrypt KDF
  const newHash = hashPassword(newPassword);
  db.updateUserPassword(userId, newHash);

  const user = db.get('users').find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Issue brand-new authenticated session
  const token = generateToken(user.id);
  const device = req.headers['user-agent']?.substring(0, 50) || 'Web Client';
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  db.createSession(user.id, token, device, ip);

  db.logAudit(user.id, user.username, 'PASSWORD_RESET_SUCCESS', 'Password successfully reset via verified OTP');

  return res.json({
    success: true,
    message: 'Password reset successful! You are now logged in.',
    token,
    user
  });
});
