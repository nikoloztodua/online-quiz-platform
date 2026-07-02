import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Attempt, Quiz, User, connectDb, isValidId, toId } from './db/init.js';
import { seedAdmin } from './db/seedAdmin.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import quizzesRouter, { submitAttempt } from './routes/quizzes.js';
import adminRouter from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

app.get('/api/me', requireAuth, async (req, res) => {
  if (!isValidId(req.user.id)) return res.status(404).json({ error: 'user not found' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'user not found' });

  return res.json({
    id: toId(user),
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
  });
});

app.put('/api/attempts/:id/answer', requireAuth, requireRole('student'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'attempt not found' });
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'attempt not found' });
  if (toId(attempt.student_id) !== req.user.id) {
    return res.status(403).json({ error: 'not your attempt' });
  }
  if (attempt.status !== 'in_progress' || new Date() >= attempt.expires_at) {
    return res.status(409).json({ error: 'quiz time has expired' });
  }

  const quiz = await Quiz.findById(attempt.quiz_id);
  const { question_id, option_id } = req.body;
  const question = quiz?.questions.find((item) => toId(item) === question_id);
  const option = question?.options.find((item) => toId(item) === option_id);
  if (!question || !option) return res.status(400).json({ error: 'invalid question or option' });

  const existing = attempt.answers.find((answer) => toId(answer.question_id) === question_id);
  if (existing) existing.option_id = option._id;
  else attempt.answers.push({ question_id: question._id, option_id: option._id });
  await attempt.save();
  return res.json({ message: 'answer saved' });
});

app.get('/api/attempts/me', requireAuth, requireRole('student'), async (req, res) => {
  const attempts = await Attempt.find({ student_id: req.user.id, status: { $ne: 'in_progress' } })
    .sort({ submitted_at: -1 })
    .populate('quiz_id', 'title');

  return res.json(
    attempts.map((attempt) => ({
      id: toId(attempt),
      quiz_id: toId(attempt.quiz_id),
      student_id: toId(attempt.student_id),
      quiz_title: attempt.quiz_id?.title || 'Deleted quiz',
      score: attempt.score,
      total: attempt.total,
      submitted_at: attempt.submitted_at,
    }))
  );
});

app.get('/api/attempts/:id', requireAuth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'attempt not found' });

  const attempt = await Attempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'attempt not found' });

  const quiz = await Quiz.findById(attempt.quiz_id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const canView =
    req.user.role === 'admin' ||
    toId(attempt.student_id) === req.user.id ||
    (req.user.role === 'teacher' && toId(quiz.created_by) === req.user.id);

  if (!canView) return res.status(403).json({ error: 'not allowed to view this attempt' });

  const selectedByQuestion = new Map(
    attempt.answers.map((answer) => [toId(answer.question_id), toId(answer.option_id)])
  );

  return res.json({
    id: toId(attempt),
    score: attempt.score,
    total: attempt.total,
    percentage: attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0,
    submitted_at: attempt.submitted_at,
    quiz: {
      id: toId(quiz),
      title: quiz.title,
      description: quiz.description,
    },
    questions: quiz.questions
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((question) => ({
        id: toId(question),
        text: question.text,
        order_index: question.order_index,
        selected_option_id: selectedByQuestion.get(toId(question)) || null,
        options: question.options.map((option) => ({
          id: toId(option),
          question_id: toId(question),
          text: option.text,
          is_correct: option.is_correct,
        })),
      })),
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

async function sweepExpiredAttempts() {
  const expired = await Attempt.find({ status: 'in_progress', expires_at: { $lte: new Date() } });
  for (const attempt of expired) {
    const quiz = await Quiz.findById(attempt.quiz_id);
    if (quiz) await submitAttempt(attempt, quiz);
  }
}

let sweepInterval;

connectDb()
  .then(seedAdmin)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    sweepInterval = setInterval(() => {
      sweepExpiredAttempts().catch((err) => console.error('Expired-attempt sweep failed:', err));
    }, 60_000);
  })
  .catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });

process.on('exit', () => clearInterval(sweepInterval));
process.on('SIGTERM', () => {
  clearInterval(sweepInterval);
  process.exit(0);
});
