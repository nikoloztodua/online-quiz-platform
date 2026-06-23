import { User } from './init.js';
import { hashPassword } from '../utils/auth.js';

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';

  const existingAdmin = await User.exists({ role: 'admin' });
  if (existingAdmin) return;

  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in production environment!');
    }
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set - no admin created.');
    return;
  }

  if (password.length < 6) {
    console.warn('ADMIN_PASSWORD must be at least 6 characters - skipping.');
    return;
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    await existingUser.save();
    console.log(`Promoted existing user ${email} to admin`);
    return;
  }

  const password_hash = await hashPassword(password);
  await User.create({ email, password_hash, name, role: 'admin' });

  console.log(`Bootstrapped first admin account: ${email}`);
}
