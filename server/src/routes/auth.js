import express from 'express';
import { User, toId } from '../db/init.js';
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js';

const router = express.Router();

const ALLOWED_ROLES = ['student', 'teacher'];

function userResponse(user) {
  return {
    id: toId(user),
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, password_confirmation, name, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password || !password_confirmation || !name || !role) {
      return res.status(400).json({
        error: 'All fields required: email, password, password confirmation, name, role',
      });
    }
    if (password !== password_confirmation) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.exists({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({
      email: normalizedEmail,
      password_hash,
      name: name.trim(),
      role,
    });

    return res.status(201).json({ user: userResponse(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: toId(user), email: user.email, role: user.role });

    return res.json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
