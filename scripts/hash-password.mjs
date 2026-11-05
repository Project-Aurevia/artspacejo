// Print a scrypt hash for server/auth.js:  node scripts/hash-password.mjs "new password"
import { hashPw } from '../server/auth.js';

const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error('Usage: node scripts/hash-password.mjs "<password of at least 10 characters>"');
  process.exit(1);
}
console.log(hashPw(pw));
