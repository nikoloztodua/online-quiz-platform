import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import db from '../db/init.js';

const router = express.Router();

// GET /api/admin/users — list all users (no password hashes)
router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
    .all();
  return res.json(users);
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'cannot delete yourself' });

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  return res.json({ message: 'user deleted' });
});

export default router;