import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import db from '../db/init.js';

const router = express.Router();

// POST /api/quizzes — teacher creates quiz with questions + options
router.post('/', requireAuth, requireRole('teacher'), (req, res) => {
  const { title, description, questions } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'at least one question is required' });
  }
  for (const [qi, q] of questions.entries()) {
    if (!q.text || !q.text.trim()) {
      return res.status(400).json({ error: `question ${qi + 1}: text is required` });
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return res.status(400).json({ error: `question ${qi + 1}: at least 2 options required` });
    }
    const correctCount = q.options.filter((o) => o.is_correct).length;
    if (correctCount !== 1) {
      return res
        .status(400)
        .json({ error: `question ${qi + 1}: exactly one correct option required` });
    }
  }

  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (title, description, created_by) VALUES (?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO questions (quiz_id, text, order_index) VALUES (?, ?, ?)'
  );
  const insertOption = db.prepare(
    'INSERT INTO options (question_id, text, is_correct) VALUES (?, ?, ?)'
  );

  const createQuiz = db.transaction(() => {
    const quiz = insertQuiz.run(title.trim(), description?.trim() || '', req.user.id);
    for (const [qi, q] of questions.entries()) {
      const question = insertQuestion.run(quiz.lastInsertRowid, q.text.trim(), qi);
      for (const o of q.options) {
        insertOption.run(question.lastInsertRowid, o.text.trim(), o.is_correct ? 1 : 0);
      }
    }
    return quiz.lastInsertRowid;
  });

  const quizId = createQuiz();
  const created = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  return res.status(201).json(created);
});

// GET /api/quizzes — list all quizzes with question count + teacher name
router.get('/', requireAuth, (req, res) => {
  const quizzes = db
    .prepare(
      `SELECT q.*, u.name AS teacher_name,
        COUNT(DISTINCT qu.id) AS question_count
      FROM quizzes q
      LEFT JOIN users u ON u.id = q.created_by
      LEFT JOIN questions qu ON qu.quiz_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC`
    )
    .all();
  return res.json(quizzes);
});

// GET /api/quizzes/:id — get one quiz with questions + options
// Students do NOT see is_correct
router.get('/:id', requireAuth, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const questions = db
    .prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index')
    .all(quiz.id);

  const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';

  for (const q of questions) {
    const options = db.prepare('SELECT * FROM options WHERE question_id = ?').all(q.id);
    q.options = isTeacherOrAdmin
      ? options
      : options.map(({ is_correct, ...rest }) => rest);
  }

  quiz.questions = questions;
  return res.json(quiz);
});

// POST /api/quizzes/:id/attempts — student submits answers, server grades
router.post('/:id/attempts', requireAuth, requireRole('student'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const { answers } = req.body; // expected: [{ question_id, option_id }]
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers array is required' });
  }

  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ?').all(quiz.id);

  if (answers.length !== questions.length) {
    return res
      .status(400)
      .json({ error: `expected ${questions.length} answers, got ${answers.length}` });
  }

  let score = 0;
  for (const a of answers) {
    const option = db
      .prepare('SELECT * FROM options WHERE id = ? AND question_id = ?')
      .get(a.option_id, a.question_id);
    if (!option) {
      return res
        .status(400)
        .json({ error: `invalid option_id ${a.option_id} for question ${a.question_id}` });
    }
    if (option.is_correct) score++;
  }

  const insertAttempt = db.prepare(
    'INSERT INTO attempts (quiz_id, student_id, score, total) VALUES (?, ?, ?, ?)'
  );
  const insertAnswer = db.prepare(
    'INSERT INTO answers (attempt_id, question_id, option_id) VALUES (?, ?, ?)'
  );

  const submitAttempt = db.transaction(() => {
    const attempt = insertAttempt.run(quiz.id, req.user.id, score, questions.length);
    for (const a of answers) {
      insertAnswer.run(attempt.lastInsertRowid, a.question_id, a.option_id);
    }
    return attempt.lastInsertRowid;
  });

  const attemptId = submitAttempt();

  return res.status(201).json({
    attempt_id: attemptId,
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
  });
});

// PUT /api/quizzes/:id — teacher updates title + description of their own quiz
router.put('/:id', requireAuth, requireRole('teacher'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (quiz.created_by !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  const { title, description } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

  db.prepare('UPDATE quizzes SET title = ?, description = ? WHERE id = ?').run(
    title.trim(),
    description?.trim() || '',
    quiz.id
  );

  return res.json(db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz.id));
});

// DELETE /api/quizzes/:id — teacher deletes their own quiz (cascade handles the rest)
router.delete('/:id', requireAuth, requireRole('teacher'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (quiz.created_by !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  db.prepare('DELETE FROM quizzes WHERE id = ?').run(quiz.id);
  return res.json({ message: 'quiz deleted' });
});

// GET /api/quizzes/:id/attempts — teacher views all attempts on their quiz
router.get('/:id/attempts', requireAuth, requireRole('teacher'), (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });
  if (quiz.created_by !== req.user.id) return res.status(403).json({ error: 'not your quiz' });

  const attempts = db
    .prepare(
      `SELECT a.*, u.name AS student_name, u.email AS student_email
      FROM attempts a
      LEFT JOIN users u ON u.id = a.student_id
      WHERE a.quiz_id = ?
      ORDER BY a.submitted_at DESC`
    )
    .all(quiz.id);

  return res.json(attempts);
});

export default router;