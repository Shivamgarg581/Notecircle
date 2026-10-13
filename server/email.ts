import type { User } from '../src/types/index.ts';
import { db } from './db.ts';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  configured: boolean;
  requiresDomainVerification?: boolean;
  allowedTestingRecipient?: string;
}

/**
 * Normalizes and cleans the sender address from environment variables.
 * Handles cases where the value was configured as `RESEND_FROM_EMAIL=NoteCircle <...>` or with quotes.
 */
export function getResendFromEmail(): string {
  let from = process.env.RESEND_FROM_EMAIL?.trim() || '';
  if (from.startsWith('RESEND_FROM_EMAIL=')) {
    from = from.substring('RESEND_FROM_EMAIL='.length).trim();
  }
  from = from.replace(/^["']|["']$/g, '').trim();
  return from || 'NoteCircle <onboarding@resend.dev>';
}

/**
 * Tracks the verified test email address associated with the Resend API key.
 * On Resend free tier sandbox (onboarding@resend.dev), only this email can receive testing emails
 * until a custom domain is verified at resend.com/domains.
 */
let verifiedResendOwnerEmail = 'vjagarwal1144@gmail.com';

export function getVerifiedResendOwnerEmail(): string {
  return verifiedResendOwnerEmail;
}

/**
 * Dispatches transactional email strictly using Resend as the sole email provider.
 * Never exposes or logs RESEND_API_KEY.
 */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  type: string
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    const errorMsg = 'Resend is not configured (RESEND_API_KEY environment variable is required).';
    db.logEmail(to, type, 'BLOCKED_CREDENTIALS_REQUIRED', 'resend', errorMsg);
    console.warn(`[RESEND EMAIL] Outgoing email "${subject}" to <${to}> blocked: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
      provider: 'resend',
      configured: false
    };
  }

  const fromEmail = getResendFromEmail();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: htmlContent,
        text: textContent
      })
    });

    const data = (await res.json().catch(() => ({}))) as any;

    if (res.ok && data.id) {
      db.logEmail(to, type, 'SENT', 'resend', undefined);
      return {
        success: true,
        messageId: data.id,
        provider: 'resend',
        configured: true
      };
    } else {
      const errMsg = data.message || (data.statusCode ? `Resend API Error ${data.statusCode}: ${data.name || 'Unknown'}` : `Resend returned HTTP ${res.status}`);

      // Detect Resend test domain sandbox restriction:
      const isSandboxRestriction = typeof errMsg === 'string' && (
        errMsg.includes('You can only send testing emails to your own email address') ||
        errMsg.includes('resend.com/domains')
      );

      if (isSandboxRestriction) {
        // Dynamically parse and cache the verified test email from Resend's error message
        const match = errMsg.match(/own email address \(([^)]+)\)/i);
        if (match && match[1]) {
          verifiedResendOwnerEmail = match[1].trim();
        }

        db.logEmail(to, type, 'BLOCKED_DOMAIN_VERIFICATION_REQUIRED', 'resend', errMsg);
        console.warn(
          `[RESEND EMAIL] Outgoing email "${subject}" to <${to}> held: Resend sandbox domain (${fromEmail}) requires a custom verified domain at resend.com/domains to deliver to arbitrary external recipients. Testing delivery is limited to verified address: ${verifiedResendOwnerEmail}.`
        );
        return {
          success: false,
          error: errMsg,
          provider: 'resend',
          configured: true,
          requiresDomainVerification: true,
          allowedTestingRecipient: verifiedResendOwnerEmail
        };
      }

      db.logEmail(to, type, 'FAILED', 'resend', errMsg);
      console.error(`[RESEND EMAIL] Failed to send email to <${to}>: ${errMsg}`);
      return {
        success: false,
        error: errMsg,
        provider: 'resend',
        configured: true
      };
    }
  } catch (err: any) {
    const errMsg = err?.message || 'Network error connecting to Resend API';
    db.logEmail(to, type, 'FAILED', 'resend', errMsg);
    console.error(`[RESEND EMAIL] Network error delivering to <${to}>: ${errMsg}`);
    return {
      success: false,
      error: errMsg,
      provider: 'resend',
      configured: true
    };
  }
}

// 1. Registration OTP Email
export async function sendRegistrationOtpEmail(email: string, otp: string, expiresMinutes = 10): Promise<EmailSendResult> {
  const subject = `Your NoteCircle Verification Code: ${otp}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F0; margin: 0; padding: 24px; color: #171717; }
          .container { max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0px #171717; padding: 32px; }
          .logo { font-size: 26px; font-weight: 900; color: #171717; letter-spacing: -0.5px; margin-bottom: 20px; }
          .otp-badge { background: #FFC72C; border: 3px solid #171717; border-radius: 14px; padding: 16px; font-size: 32px; font-weight: 900; letter-spacing: 6px; text-align: center; color: #171717; box-shadow: 4px 4px 0px #171717; margin: 24px 0; }
          .footer { font-size: 11px; font-weight: 700; color: #77736D; border-top: 2px solid #E5E1D8; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NoteCircle</div>
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0;">Verify your email address</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #4A4742; margin: 0 0 16px 0;">
            Use the 6-digit one-time code below to verify your email and activate your private NoteCircle account.
          </p>
          <div class="otp-badge">${otp}</div>
          <p style="font-size: 12px; font-weight: 700; color: #6B6863; margin: 0;">
            This verification code expires in <strong>${expiresMinutes} minutes</strong> and can only be used once. Never share this code with anyone.
          </p>
          <div class="footer">
            NoteCircle · Zero public feeds · End-to-end encrypted · Private circles only
          </div>
        </div>
      </body>
    </html>
  `;
  const text = `Your NoteCircle verification code is: ${otp}\n\nThis code expires in ${expiresMinutes} minutes. Never share this code with anyone.\n\nNoteCircle`;

  return sendTransactionalEmail(email, subject, html, text, 'REGISTRATION_OTP');
}

// 2. Welcome Email
export async function sendWelcomeEmail(email: string, displayName: string, username: string): Promise<EmailSendResult> {
  const subject = `Welcome to NoteCircle, @${username}!`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F0; margin: 0; padding: 24px; color: #171717; }
          .container { max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0px #171717; padding: 32px; }
          .logo { font-size: 26px; font-weight: 900; color: #171717; margin-bottom: 20px; }
          .card { background: #FAF7F0; border: 2.5px solid #171717; border-radius: 14px; padding: 18px; margin: 20px 0; box-shadow: 3px 3px 0px #171717; }
          .footer { font-size: 11px; font-weight: 700; color: #77736D; border-top: 2px solid #E5E1D8; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NoteCircle</div>
          <h2 style="font-size: 20px; font-weight: 900; margin: 0 0 10px 0;">Welcome, ${displayName}!</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #4A4742;">
            Your account <strong>@${username}</strong> is now verified and active.
          </p>
          <div class="card">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 900;">Your Private Circle Principles:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #171717; line-height: 1.6;">
              <li><strong>Zero public discovery:</strong> Strangers cannot browse your notes or follower lists.</li>
              <li><strong>End-to-end encrypted chat:</strong> Only you and your recipient hold decryption keys.</li>
              <li><strong>Ephemeral status notes:</strong> Broadcast what you are doing without permanent social clutter.</li>
            </ul>
          </div>
          <div class="footer">
            NoteCircle · Stay connected with your trusted circle without the noise.
          </div>
        </div>
      </body>
    </html>
  `;
  const text = `Welcome to NoteCircle, ${displayName} (@${username})!\n\nYour account is now verified and active.\n\nNoteCircle · Zero public feeds · End-to-end encrypted`;

  return sendTransactionalEmail(email, subject, html, text, 'WELCOME_EMAIL');
}

// 3. Password / Account Recovery Email
export async function sendPasswordRecoveryEmail(email: string, code: string): Promise<EmailSendResult> {
  const subject = `Your NoteCircle Account Recovery Code: ${code}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #FAF7F0; padding: 24px; color: #171717;">
        <div style="max-width: 500px; margin: 0 auto; background: #fff; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0px #171717; padding: 32px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 12px;">NoteCircle Account Recovery</h1>
          <p style="font-size: 14px; color: #4A4742;">A request was received to reset your password. Use the 6-digit code below:</p>
          <div style="background: #FFC72C; border: 3px solid #171717; border-radius: 14px; padding: 16px; font-size: 32px; font-weight: 900; letter-spacing: 6px; text-align: center; margin: 24px 0; box-shadow: 4px 4px 0px #171717;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #6B6863;">This code expires in 15 minutes. If you did not request this, please disregard.</p>
        </div>
      </body>
    </html>
  `;
  const text = `Your NoteCircle password recovery code is: ${code}\n\nExpires in 15 minutes.\n\nNoteCircle`;

  return sendTransactionalEmail(email, subject, html, text, 'PASSWORD_RECOVERY');
}

// 4. Important Security Alert Email
export async function sendSecurityAlertEmail(email: string, title: string, message: string): Promise<EmailSendResult> {
  const subject = `[Security Alert] ${title}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #FAF7F0; padding: 24px; color: #171717;">
        <div style="max-width: 500px; margin: 0 auto; background: #fff; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0px #171717; padding: 32px;">
          <h2 style="font-size: 20px; font-weight: 900; color: #D90429; margin-bottom: 12px;">Security Alert</h2>
          <p style="font-size: 14px; color: #171717; line-height: 1.5;">${message}</p>
          <p style="font-size: 12px; color: #77736D; margin-top: 20px;">If this was not you, please log into NoteCircle and revoke all active sessions immediately from Settings > Security.</p>
        </div>
      </body>
    </html>
  `;
  const text = `[Security Alert] ${title}\n\n${message}\n\nNoteCircle`;

  return sendTransactionalEmail(email, subject, html, text, 'SECURITY_ALERT');
}

// 5. Admin Notification of New Verified User
export async function sendAdminNewUserAlert(newUser: User): Promise<EmailSendResult | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || verifiedResendOwnerEmail || 'vjagarwal1144@gmail.com';
  if (!adminEmail) return null;

  const subject = `[Admin Alert] New Verified User: @${newUser.username}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: sans-serif; background-color: #FAF7F0; padding: 24px; color: #171717;">
        <div style="max-width: 500px; margin: 0 auto; background: #fff; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0px #171717; padding: 32px;">
          <h2 style="font-size: 20px; font-weight: 900; margin-bottom: 12px;">New User Activated</h2>
          <p style="font-size: 14px; color: #171717;">
            <strong>Username:</strong> @${newUser.username}<br>
            <strong>Display Name:</strong> ${newUser.displayName}<br>
            <strong>Email:</strong> ${newUser.email || 'None'}<br>
            <strong>Joined At:</strong> ${new Date(newUser.createdAt).toUTCString()}
          </p>
        </div>
      </body>
    </html>
  `;
  const text = `New User Activated:\nUsername: @${newUser.username}\nDisplay Name: ${newUser.displayName}\nEmail: ${newUser.email}\nJoined: ${newUser.createdAt}`;

  return sendTransactionalEmail(adminEmail, subject, html, text, 'ADMIN_NEW_USER');
}
