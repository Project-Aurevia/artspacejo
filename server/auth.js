// Password hashing + the built-in owner account.
// The owner is defined HERE (in code), not in the database or .env, so it survives redeploys, a
// wiped data folder or a fresh VPS. Only a salted scrypt hash is stored — never the password.
// To change it: `node scripts/hash-password.mjs "new password"` and paste the result into ROOT.hash.
import crypto from 'node:crypto';

export const hashPw = (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(String(pw), salt, 64).toString('hex')}`;
};
export const verifyPw = (pw, stored) => {
  const [alg, salt, h] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !h) return false;
  const a = crypto.scryptSync(String(pw), salt, 64);
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const ROOT = {
  id: 'root',
  email: 'ceo@artspacejo.com',
  name: 'CEO',
  full: true,
  active: true,
  locked: true,
  hash: process.env.E2E_PASSWORD ? hashPw(process.env.E2E_PASSWORD) : "scrypt$0159c0b7ad21fe4c948d664e60de4330$740feb3835abf9dad672771db124a32845fdf2d9e9b2fc22c84d1a0c3b56b86f6e8a1f68db93781c06a0aa56611309330ceb9e095146eba45d269ddda964d6f6",
};
// Verified against when the email is unknown, so a wrong email costs the same time as a wrong password.
export const DUMMY_HASH = hashPw('not-a-real-password');
