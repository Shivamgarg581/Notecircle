/**
 * NoteCircle Cloudflare Turnstile CAPTCHA Verification
 * Verifies Turnstile tokens securely on the backend before account creation.
 * Rejects missing, invalid, expired, and already-used tokens.
 */

// Memory cache of recently consumed tokens to prevent replay attacks
const consumedTokens = new Map<string, number>();

// Clean up expired consumed tokens every 5 minutes (Turnstile tokens have max 5-min TTL)
const TOKEN_TTL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of consumedTokens.entries()) {
    if (now - timestamp > TOKEN_TTL_MS) {
      consumedTokens.delete(token);
    }
  }
}, 60 * 1000);

export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
  hostname?: string;
}

/**
 * Verifies a Cloudflare Turnstile token.
 * Defaults to Cloudflare's official testing secret key (1x0000000000000000000000000000000AA) if TURNSTILE_SECRET_KEY is not set.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<CaptchaVerificationResult> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      error: 'CAPTCHA verification is required. Please complete the security check.'
    };
  }

  const cleanToken = token.trim();

  // Replay protection: check if token was already used
  if (consumedTokens.has(cleanToken)) {
    return {
      success: false,
      error: 'Security challenge has already been used. Please complete a new security check.'
    };
  }

  const secretKey =
    process.env.TURNSTILE_SECRET_KEY?.trim() ||
    '1x0000000000000000000000000000000AA'; // Official Turnstile test secret key (always passes)

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', cleanToken);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Cloudflare Turnstile verification server error (HTTP ${res.status}).`
      };
    }

    const outcome = (await res.json()) as any;

    if (outcome && outcome.success) {
      // Mark token as consumed
      consumedTokens.set(cleanToken, Date.now());
      return {
        success: true,
        hostname: outcome.hostname
      };
    }

    const errorCodes = Array.isArray(outcome?.['error-codes'])
      ? outcome['error-codes'].join(', ')
      : 'invalid-input-response';

    let userFriendlyError = 'Security verification failed. Please try again.';
    if (errorCodes.includes('timeout-or-duplicate')) {
      userFriendlyError = 'Security challenge expired or already used. Please complete a fresh check.';
    } else if (errorCodes.includes('invalid-input-response')) {
      userFriendlyError = 'Invalid security verification response. Please complete the CAPTCHA check.';
    }

    return {
      success: false,
      error: userFriendlyError
    };
  } catch (err: any) {
    console.error('[CAPTCHA] Verification error:', err?.message || err);
    return {
      success: false,
      error: 'Unable to verify security challenge due to a network error. Please try again.'
    };
  }
}
