import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '../server/src/db/database';
import { getFounderEmail } from '../server/src/controllers/auth.controller';

async function run() {
  const newPassword = process.argv[2];

  if (!newPassword || newPassword.trim().length < 8) {
    console.error('Usage: npx tsx scripts/reset-founder-password.ts "<new-password-at-least-8-chars>"');
    process.exit(1);
  }

  const founderEmail = getFounderEmail();
  const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(founderEmail) as any;

  if (!user) {
    console.error('Founder account not found for configured email:', founderEmail);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, now, user.id);

  console.log('Success: Founder password has been updated securely for ' + founderEmail);
  console.log('You can now log in at http://localhost:3000 with your new password.');
}

run().catch((err) => {
  console.error('Error updating founder password:', err.message);
  process.exit(1);
});
