import express from 'express';
import db from '../db/init.js';
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js';

const router = express.Router();

const ALLOWED_ROLES = ['student', 'teacher'];

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields required: email, password, name, role' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);
    const result = db
      .prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run(email, password_hash, name, role);

    const user = db
      .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db
      .prepare('SELECT id, email, password_hash, name, role FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;