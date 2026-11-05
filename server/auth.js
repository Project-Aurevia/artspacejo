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
  hash: 'scrypt$eda0fe6934b1b55d07b952f090d6e9eb$d2f2fd45fcf45856a745bbb99862cfb754aecb8c5eb8e35dc6cbe823d5cea912ed285baf8a966fbe9ba1a2b608e9bffc2d7716039b7fbe83cf795256fe93cc84',
};
// Verified against when the email is unknown, so a wrong email costs the same time as a wrong password.
export const DUMMY_HASH = hashPw('not-a-real-password');
