// Online Quiz Platform — Authentication routes
// Authors: Nikoloz Todua, Iakobi Gogebashvili
//
// Endpoints:
//   POST /api/auth/register  — ახალი user-ის რეგისტრაცია
//   POST /api/auth/login     — შესვლა + JWT token

import express from 'express';
import db from '../db/init.js';
import { hashPassword, verifyPassword, signToken } from '../utils/auth.js';

const router = express.Router();

// დასაშვები role-ები — სხვა value-ს არ ვიღებთ
const ALLOWED_ROLES = ['student', 'teacher', 'admin'];

// ============================================================
// POST /api/auth/register
// ============================================================
//
// Request body: { email, password, name, role }
// Response: { user: { id, email, name, role } }  (პაროლის ჰეშის გარეშე!)
//
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // ვალიდაცია — ყველა ველი სავალდებულოა
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: 'All fields required: email, password, name, role',
      });
    }

    // role-ის შემოწმება
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    // პაროლის სიგრძე — მინიმუმ 6 სიმბოლო
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    // შემოწმება — email უკვე ხომ არ არის ბაზაში
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // პაროლის ჰეშირება
    const password_hash = await hashPassword(password);

    // ბაზაში ჩაწერა
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES (?, ?, ?, ?)`
      )
      .run(email, password_hash, name, role);

    const userId = result.lastInsertRowid;

    // შემოვამოწმოთ რა ჩავწერეთ — password_hash-ის გარეშე
    const user = db
      .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
      .get(userId);

    return res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
//
// Request body: { email, password }
// Response: { token, user: { id, email, name, role } }
//
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ვალიდაცია — სავალდებულო ველები
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // user-ის მოძებნა email-ით
    const user = db
      .prepare('SELECT id, email, password_hash, name, role FROM users WHERE email = ?')
      .get(email);

    // უსაფრთხოების ხრიკი: არ ვამბობთ "user not found" vs "wrong password" —
    // generic message ჰაკერებს ცხოვრებას ურთულებს
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // პაროლის შემოწმება — bcrypt შეადარებს plain password-ს ჰეშთან
    const passwordOk = await verifyPassword(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // JWT token-ის გენერაცია — payload-ში id, email, role
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // ვაბრუნებთ token + user info (password_hash-ის გარეშე)
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;