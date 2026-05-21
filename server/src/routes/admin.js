import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/auth.js';
import db from '../db/init.js';

const router = express.Router();
const ALLOWED_ROLES = ['student', 'teacher', 'admin'];

router.use(requireAuth, requireRole('admin'));

router.get('/stats', (req, res) => {
  const roleRows = db.prepare('SELECT role, COUNT(*) AS count FROM users GROUP BY role').all();
  const usersByRole = { student: 0, teacher: 0, admin: 0 };
  for (const row of roleRows) usersByRole[row.role] = row.count;

  return res.json({
    users: usersByRole.student + usersByRole.teacher + usersByRole.admin,
    usersByRole,
    quizzes: db.prepare('SELECT COUNT(*) AS c FROM quizzes').get().c,
    attempts: db.prepare('SELECT COUNT(*) AS c FROM attempts').get().c,
  });
});

router.get('/users', (req, res) => {
  const users = db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
    .all();
  return res.json(users);
});

router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields required: name, email, password, role' });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
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
  return res.status(201).json(user);
});

router.put('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'cannot update yourself' });

  const { role } = req.body;
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  return res.json(
    db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(user.id)
  );
});

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'cannot delete yourself' });

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return res.json({ message: 'user deleted' });
});

export default router;