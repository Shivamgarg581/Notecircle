/**
 * NoteCircle Email Normalizer
 * Enforces:
 * 1. Exactly one account per normalized Gmail address.
 * 2. Case normalization for all providers.
 * 3. Gmail-specific normalization: strips all dots (.) and plus-address tags (+alias).
 * 4. Normalizes googlemail.com to gmail.com.
 * 5. Strictly preserves dots and plus signs for non-Gmail providers.
 */

export interface NormalizedEmailResult {
  normalized: string;
  raw: string;
  isGmail: boolean;
}

export function normalizeEmail(email: string): NormalizedEmailResult {
  if (!email || typeof email !== 'string') {
    return { normalized: '', raw: '', isGmail: false };
  }

  const raw = email.trim().toLowerCase();
  const atIndex = raw.lastIndexOf('@');
  if (atIndex === -1) {
    return { normalized: raw, raw, isGmail: false };
  }

  const localPart = raw.substring(0, atIndex);
  const domainPart = raw.substring(atIndex + 1);

  // Check if Gmail domain (including legacy googlemail.com)
  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    // Strip everything after '+'
    const beforePlus = localPart.split('+')[0];
    // Remove all dots
    const withoutDots = beforePlus.replace(/\./g, '');
    return {
      normalized: `${withoutDots}@gmail.com`,
      raw,
      isGmail: true
    };
  }

  // Non-Gmail providers: keep dots and plus signs intact, only case-fold
  return {
    normalized: raw,
    raw,
    isGmail: false
  };
}
