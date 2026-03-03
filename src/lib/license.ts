/**
 * Pharmacy Hub — License & Subscription Manager
 * Master key: "Rorschach" (case-sensitive)
 * Subscription: 365-day encrypted token
 */

const LICENSE_KEY = 'ph_license_v2';
const MASTER_KEY_HASH_KEY = 'ph_mkh';

// Obfuscated master key hash — "Rorschach"
// We store a derived hash so the plaintext never sits in storage
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  // Secondary mix
  let h2 = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h2 ^= s.charCodeAt(i);
    h2 = (h2 * 0x01000193) >>> 0;
  }
  return (h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).toUpperCase();
}

// The hardcoded expected hash of "Rorschach"
const MASTER_HASH = hashString('Rorschach');

export function verifyMasterKey(input: string): boolean {
  return hashString(input) === MASTER_HASH;
}

// ─── License token structure ───────────────────────────────────────────────
interface LicenseToken {
  activatedAt: number;   // epoch ms
  expiresAt: number;     // epoch ms
  sig: string;           // integrity signature
  tier: 'trial' | 'full';
}

function signToken(activatedAt: number, expiresAt: number, tier: string): string {
  const payload = `${activatedAt}|${expiresAt}|${tier}|PH-ET-2025`;
  return hashString(payload);
}

function encodeToken(token: LicenseToken): string {
  const json = JSON.stringify(token);
  // Simple XOR obfuscation with rotating key
  const key = 'PharmacyHubEthiopia365';
  let out = '';
  for (let i = 0; i < json.length; i++) {
    out += String.fromCharCode(json.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(out);
}

function decodeToken(encoded: string): LicenseToken | null {
  try {
    const key = 'PharmacyHubEthiopia365';
    const raw = atob(encoded);
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.parse(out) as LicenseToken;
  } catch {
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export type LicenseStatus =
  | 'no_license'       // never activated
  | 'active'           // valid and within 365 days
  | 'expired'          // past expiry
  | 'tampered';        // signature mismatch

export interface LicenseInfo {
  status: LicenseStatus;
  activatedAt?: Date;
  expiresAt?: Date;
  daysRemaining?: number;
  daysUsed?: number;
  tier?: 'trial' | 'full';
}

export function getLicenseInfo(): LicenseInfo {
  const raw = localStorage.getItem(LICENSE_KEY);
  if (!raw) return { status: 'no_license' };

  const token = decodeToken(raw);
  if (!token) return { status: 'tampered' };

  // Verify signature
  const expectedSig = signToken(token.activatedAt, token.expiresAt, token.tier);
  if (token.sig !== expectedSig) return { status: 'tampered' };

  const now = Date.now();
  const activatedAt = new Date(token.activatedAt);
  const expiresAt = new Date(token.expiresAt);
  const daysRemaining = Math.ceil((token.expiresAt - now) / (1000 * 60 * 60 * 24));
  const daysUsed = Math.floor((now - token.activatedAt) / (1000 * 60 * 60 * 24));

  if (now > token.expiresAt) {
    return { status: 'expired', activatedAt, expiresAt, daysRemaining: 0, daysUsed, tier: token.tier };
  }

  return { status: 'active', activatedAt, expiresAt, daysRemaining, daysUsed, tier: token.tier };
}

/** Activate a 365-day license. Requires master key verification first. */
export function activateLicense(): boolean {
  const now = Date.now();
  const expiresAt = now + 365 * 24 * 60 * 60 * 1000;
  const tier: 'full' = 'full';
  const sig = signToken(now, expiresAt, tier);
  const token: LicenseToken = { activatedAt: now, expiresAt, sig, tier };
  localStorage.setItem(LICENSE_KEY, encodeToken(token));
  return true;
}

/** Renew (extend) license by another 365 days from now. */
export function renewLicense(): boolean {
  return activateLicense();
}

/** Revoke license (admin tool). */
export function revokeLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
}

/** Check if master key was already verified this browser session */
export function isMasterKeyVerified(): boolean {
  return sessionStorage.getItem(MASTER_KEY_HASH_KEY) === MASTER_HASH;
}

export function setMasterKeyVerified(): void {
  sessionStorage.setItem(MASTER_KEY_HASH_KEY, MASTER_HASH);
}

export function clearMasterKeySession(): void {
  sessionStorage.removeItem(MASTER_KEY_HASH_KEY);
}
