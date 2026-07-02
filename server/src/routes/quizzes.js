import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Attempt, Quiz, User, isValidId, toId } from '../db/init.js';

const router = express.Router();

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function validateQuizInput(title, durationMinutes, questions) {
  if (!title || !title.trim()) {
    return 'title is required';
  }
  if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1 || Number(durationMinutes) > 180) {
    return 'duration must be a whole number between 1 and 180 minutes';
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'at least one question is required';
  }
  for (const [qi, q] of questions.entries()) {
    if (!q.text || !q.text.trim()) {
      return `question ${qi + 1}: text is required`;
    }
    if (q.difficulty && !DIFFICULTIES.includes(q.difficulty)) {
      return `question ${qi + 1}: invalid difficulty`;
    }
    if (q.points !== undefined && q.points !== null && q.points !== '') {
      const p = Number(q.points);
      if (!Number.isFinite(p) || p <= 0) {
        return `question ${qi + 1}: points must be a positive number`;
      }
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `question ${qi + 1}: at least 2 options required`;
    }
    const correctCount = q.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return `question ${qi + 1}: exactly one correct option required`;
    }
    if (q.options.some((o) => !o.text || !o.text.trim())) {
      return `question ${qi + 1}: option text is required`;
    }
  }
  return null;
}

function questionPayload(question, includeCorrect = true, selectedOptionId = null) {
  return {
    id: toId(question),
    text: question.text,
    order_index: question.order_index,
    difficulty: question.difficulty,
    points: question.points,
    selected_option_id: selectedOptionId,
    options: question.options.map((option) => {
      const payload = {
        id: toId(option),
        question_id: toId(question),
        text: option.text,
      };
      if (includeCorrect) payload.is_correct = option.is_correct;
      return payload;
    }),
  };
}

function quizPayload(quiz, { includeQuestions = false, includeCorrect = true, teacherName = null } = {}) {
  const maxPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

  const payload = {
    id: toId(quiz),
    title: quiz.title,
    description: quiz.description,
    duration_minutes: quiz.duration_minutes,
    created_by: toId(quiz.created_by),
    created_at: quiz.created_at,
    question_count: quiz.questions.length,
    max_points: maxPoints,
  };

  if (teacherName !== null) payload.teacher_name = teacherName;
  if (includeQuestions) {
    payload.questions = quiz.questions
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((question) => questionPayload(question, includeCorrect));
  }

  return payload;
}

function quizInput(title, description, durationMinutes, questions, createdBy) {
  return {
    title: title.trim(),
    description: description?.trim() || '',
    duration_minutes: Number(durationMinutes),
    ...(createdBy ? { created_by: createdBy } : {}),
    questions: questions.map((question, index) => ({
      text: question.text.trim(),
      order_index: index,
      difficulty: question.difficulty || 'medium',
      points: question.points ? Number(question.points) : 1,
      options: question.options.map((option) => ({
        text: option.text.trim(),
        is_correct: Boolean(option.is_correct),
      })),
    })),
  };
}

router.post('/', requireAuth, requireRole('teacher'), async (req, res) => {
  const { title, description, duration_minutes, questions } = req.body;

  const validationError = validateQuizInput(title, duration_minutes, questions);
  if (validationError) return res.status(400).json({ error: validationError });

  const quiz = await Quiz.create(quizInput(title, description, duration_minutes, questions, req.user.id));
  return res.status(201).json(quizPayload(quiz));
});

router.get('/', requireAuth, async (req, res) => {
  const quizzes = await Quiz.find().sort({ created_at: -1 }).populate('created_by', 'name');
  return res.json(
    quizzes.map((quiz) =>
      quizPayload(quiz, {
        teacherName: quiz.created_by?.name || 'Unknown teacher',
      })
    )
  );
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';
  return res.json(quizPayload(quiz, { includeQuestions: true, includeCorrect: isTeacherOrAdmin }));
});

router.post('/:id/attempts/start', requireAuth, requireRole('student'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const maxPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

  const now = new Date();
  let attempt = await Attempt.findOne({
    quiz_id: quiz._id,
    student_id: req.user.id,
    status: 'in_progress',
  }).sort({ started_at: -1 });

  if (attempt && attempt.expires_at <= now) {
    await submitAttempt(attempt, quiz);
    return res.json({
      attempt_id: toId(attempt),
      status: 'submitted',
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      answers: attempt.answers.map((answer) => ({
        question_id: toId(answer.question_id),
        option_id: toId(answer.option_id),
      })),
    });
  }

  if (!attempt) {
    const durationMinutes = quiz.duration_minutes || 10;
    attempt = await Attempt.create({
      quiz_id: quiz._id,
      student_id: req.user.id,
      total: maxPoints,
      status: 'in_progress',
      started_at: now,
      expires_at: new Date(now.getTime() + durationMinutes * 60_000),
      answers: [],
    });
  }

  return res.status(201).json({
    attempt_id: toId(attempt),
    started_at: attempt.started_at,
    expires_at: attempt.expires_at,
    answers: attempt.answers.map((answer) => ({
      question_id: toId(answer.question_id),
      option_id: toId(answer.option_id),
    })),
  });
});

function gradeAttempt(attempt, quiz) {
  let score = 0;
  for (const answer of attempt.answers) {
    const question = quiz.questions.find((item) => toId(item) === toId(answer.question_id));
    if (!question) continue;
    const option = question.options.find((item) => toId(item) === toId(answer.option_id));
    if (option?.is_correct) score += question.points || 1;
  }
  return score;
}

export async function submitAttempt(attempt, quiz) {
  if (attempt.status !== 'submitted') {
    const maxPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    attempt.score = gradeAttempt(attempt, quiz);
    attempt.total = maxPoints;
    attempt.status = 'submitted';
    attempt.submitted_at = new Date();
    await attempt.save();
  }
  return attempt;
}

router.post('/:id/attempts/:attemptId/submit', requireAuth, requireRole('student'), async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.attemptId)) {
    return res.status(404).json({ error: 'attempt not found' });
  }
  const [quiz, attempt] = await Promise.all([
    Quiz.findById(req.params.id),
    Attempt.findById(req.params.attemptId),
  ]);
  if (!quiz || !attempt || toId(attempt.quiz_id) !== req.params.id) {
    return res.status(404).json({ error: 'attempt not found' });
  }
  if (toId(attempt.student_id) !== req.user.id) {
    return res.status(403).json({ error: 'not your attempt' });
  }
  await submitAttempt(attempt, quiz);
  return res.status(201).json({
    attempt_id: toId(attempt),
    score: attempt.score,
    total: attempt.total,
    percentage: Math.round((attempt.score / attempt.total) * 100),
  });
});

router.put('/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (toId(quiz.created_by) !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  const { title, description, duration_minutes, questions } = req.body;
  const validationError = validateQuizInput(title, duration_minutes, questions);
  if (validationError) return res.status(400).json({ error: validationError });

  Object.assign(quiz, quizInput(title, description, duration_minutes, questions));
  await quiz.save();

  return res.json(quizPayload(quiz));
});

router.delete('/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (toId(quiz.created_by) !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  await Promise.all([
    Attempt.deleteMany({ quiz_id: quiz._id }),
    Quiz.deleteOne({ _id: quiz._id }),
  ]);

  return res.json({ message: 'quiz and all associated questions/options deleted successfully' });
});

router.get('/:id/attempts', requireAuth, requireRole('teacher'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (toId(quiz.created_by) !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  const attempts = await Attempt.find({ quiz_id: quiz._id, status: { $ne: 'in_progress' } })
    .sort({ submitted_at: -1 })
    .populate('student_id', 'name email');

  return res.json(
    attempts.map((attempt) => ({
      id: toId(attempt),
      quiz_id: toId(attempt.quiz_id),
      student_id: toId(attempt.student_id),
      student_name: attempt.student_id?.name || 'Unknown student',
      student_email: attempt.student_id?.email || '',
      score: attempt.score,
      total: attempt.total,
      submitted_at: attempt.submitted_at,
    }))
  );
});

export default router;