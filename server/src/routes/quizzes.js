import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Attempt, Quiz, User, isValidId, toId } from '../db/init.js';

const router = express.Router();

function validateQuizInput(title, questions) {
  if (!title || !title.trim()) {
    return 'title is required';
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'at least one question is required';
  }
  for (const [qi, q] of questions.entries()) {
    if (!q.text || !q.text.trim()) {
      return `question ${qi + 1}: text is required`;
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
  const payload = {
    id: toId(quiz),
    title: quiz.title,
    description: quiz.description,
    created_by: toId(quiz.created_by),
    created_at: quiz.created_at,
    question_count: quiz.questions.length,
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

function quizInput(title, description, questions, createdBy) {
  return {
    title: title.trim(),
    description: description?.trim() || '',
    ...(createdBy ? { created_by: createdBy } : {}),
    questions: questions.map((question, index) => ({
      text: question.text.trim(),
      order_index: index,
      options: question.options.map((option) => ({
        text: option.text.trim(),
        is_correct: Boolean(option.is_correct),
      })),
    })),
  };
}

router.post('/', requireAuth, requireRole('teacher'), async (req, res) => {
  const { title, description, questions } = req.body;

  const validationError = validateQuizInput(title, questions);
  if (validationError) return res.status(400).json({ error: validationError });

  const quiz = await Quiz.create(quizInput(title, description, questions, req.user.id));
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

router.post('/:id/attempts', requireAuth, requireRole('student'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const { answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers array is required' });
  }

  if (answers.length !== quiz.questions.length) {
    return res
      .status(400)
      .json({ error: `expected ${quiz.questions.length} answers, got ${answers.length}` });
  }

  let score = 0;
  const answerPayload = [];

  for (const answer of answers) {
    const question = quiz.questions.find((item) => toId(item) === answer.question_id);
    if (!question) {
      return res.status(400).json({ error: `invalid question_id ${answer.question_id}` });
    }

    const option = question.options.find((item) => toId(item) === answer.option_id);
    if (!option) {
      return res
        .status(400)
        .json({ error: `invalid option_id ${answer.option_id} for question ${answer.question_id}` });
    }

    if (option.is_correct) score++;
    answerPayload.push({
      question_id: question._id,
      option_id: option._id,
    });
  }

  const attempt = await Attempt.create({
    quiz_id: quiz._id,
    student_id: req.user.id,
    score,
    total: quiz.questions.length,
    answers: answerPayload,
  });

  return res.status(201).json({
    attempt_id: toId(attempt),
    score,
    total: quiz.questions.length,
    percentage: Math.round((score / quiz.questions.length) * 100),
  });
});

router.put('/:id', requireAuth, requireRole('teacher'), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (toId(quiz.created_by) !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  const { title, description, questions } = req.body;
  const validationError = validateQuizInput(title, questions);
  if (validationError) return res.status(400).json({ error: validationError });

  Object.assign(quiz, quizInput(title, description, questions));
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

  const attempts = await Attempt.find({ quiz_id: quiz._id })
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
