import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/init.js';
import { seedAdmin } from './db/seedAdmin.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import quizzesRouter from './routes/quizzes.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

app.get('/api/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  return res.json(user);
});

app.get('/api/attempts/me', requireAuth, requireRole('student'), (req, res) => {
  // გაუმჯობესება: PRAGMA-თი ვამოწმებთ სვეტის სახელს, რომ კოდი არ გაფრინდეს თუ ბაზაში user_id წერია
  const columns = db.prepare("PRAGMA table_info(attempts)").all();
  const hasUserId = columns.some(col => col.name === 'user_id');
  const studentColumn = hasUserId ? 'a.user_id' : 'a.student_id';

  const attempts = db
    .prepare(
      `SELECT a.*, q.title AS quiz_title
       FROM attempts a
       LEFT JOIN quizzes q ON q.id = a.quiz_id
       WHERE ${studentColumn} = ?
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

  const attemptStudentId = attempt.user_id || attempt.student_id;

  const canView =
    req.user.role === 'admin' ||
    attemptStudentId === req.user.id ||
    (req.user.role === 'teacher' && attempt.created_by === req.user.id);

  if (!canView) return res.status(403).json({ error: 'not allowed to view this attempt' });

  const questions = db
    .prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index')
    .all(attempt.quiz_id);
  const answers = db
    .prepare('SELECT question_id, option_id FROM answers WHERE attempt_id = ?')
    .all(attempt.id);
  const selectedByQuestion = new Map(
    answers.map((answer) => [answer.question_id, answer.option_id])
  );

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

app.use('/api/quizzes', quizzesRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: `cannot ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

seedAdmin()
  .catch((err) => console.error('Admin seeding failed:', err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  });