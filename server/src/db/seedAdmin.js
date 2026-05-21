import db from './init.js';
import { hashPassword } from '../utils/auth.js';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';

  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) return;

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin created.');
    return;
  }
  if (password.length < 6) {
    console.warn('⚠️  ADMIN_PASSWORD must be at least 6 characters — skipping.');
    return;
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existingUser.id);
    console.log(`✅ Promoted existing user ${email} to admin`);
    return;
  }

  const password_hash = await hashPassword(password);
  db.prepare(
    "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')"
  ).run(email, password_hash, name);

  console.log(`✅ Bootstrapped first admin account: ${email}`);
}