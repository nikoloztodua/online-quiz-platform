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

app.get('/api/attempts/:id', requireAuth, (req, res) => {
  const attempt = db
    .prepare(
      `SELECT a.*, q.title AS quiz_title, q.description AS quiz_description, q.created_by
      FROM attempts a
      LEFT JOIN quizzes q ON q.id = a.quiz_id
      WHERE a.id = ?`
    )
    .get(req.params.id);

  if (!attempt) return res.status(404).json({ error: 'attempt not found' });

  const canView =
    req.user.role === 'admin' ||
    attempt.student_id === req.user.id ||
    (req.user.role === 'teacher' && attempt.created_by === req.user.id);

  if (!canView) return res.status(403).json({ error: 'not allowed to view this attempt' });

  const questions = db
    .prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index')
    .all(attempt.quiz_id);
  const answers = db
    .prepare('SELECT question_id, option_id FROM answers WHERE attempt_id = ?')
    .all(attempt.id);
  const selectedByQuestion = new Map(answers.map((answer) => [answer.question_id, answer.option_id]));

  for (const question of questions) {
    question.selected_option_id = selectedByQuestion.get(question.id) || null;
    question.options = db
      .prepare('SELECT id, question_id, text, is_correct FROM options WHERE question_id = ?')
      .all(question.id);
  }

  return res.json({
    id: attempt.id,
    score: attempt.score,
    total: attempt.total,
    percentage: attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0,
    submitted_at: attempt.submitted_at,
    quiz: {
      id: attempt.quiz_id,
      title: attempt.quiz_title,
      description: attempt.quiz_description,
    },
    questions,
  });
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
