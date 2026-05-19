import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/init.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import quizzesRouter from './routes/quizzes.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── Public ────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);

// ── Current user ──────────────────────────────────────────────────────────────

app.get('/api/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  return res.json(user);
});

// ── Student: own attempt history ──────────────────────────────────────────────

app.get('/api/attempts/me', requireAuth, requireRole('student'), (req, res) => {
  const attempts = db
    .prepare(
      `SELECT a.*, q.title AS quiz_title
      FROM attempts a
      LEFT JOIN quizzes q ON q.id = a.quiz_id
      WHERE a.student_id = ?
      ORDER BY a.submitted_at DESC`
    )
    .all(req.user.id);
  return res.json(attempts);
});

// ── Quizzes ───────────────────────────────────────────────────────────────────

app.use('/api/quizzes', quizzesRouter);

// ── Admin ─────────────────────────────────────────────────────────────────────

app.use('/api/admin', adminRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `cannot ${req.method} ${req.path}` });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});