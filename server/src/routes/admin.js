import express from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/auth.js';
import { Attempt, Quiz, User, isValidId, toId } from '../db/init.js';

const router = express.Router();
const ALLOWED_ROLES = ['student', 'teacher', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userResponse(user) {
  return {
    id: toId(user),
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: user.created_at,
  };
}

router.use(requireAuth, requireRole('admin'));

router.get('/stats', async (req, res) => {
  const roleRows = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  const usersByRole = { student: 0, teacher: 0, admin: 0 };
  for (const row of roleRows) usersByRole[row._id] = row.count;

  return res.json({
    users: usersByRole.student + usersByRole.teacher + usersByRole.admin,
    usersByRole,
    quizzes: await Quiz.countDocuments(),
    attempts: await Attempt.countDocuments(),
  });
});

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ created_at: -1 });
  return res.json(users.map(userResponse));
});

router.get('/quizzes', async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = req.query.search?.trim();
  const teacherId = req.query.teacher_id;

  if (teacherId && !isValidId(teacherId)) {
    return res.status(400).json({ error: 'invalid teacher filter' });
  }

  const match = {};
  if (search) match.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (teacherId) match.created_by = new mongoose.Types.ObjectId(teacherId);

  const [result] = await Quiz.aggregate([
    { $match: match },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'created_by',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    {
      $lookup: {
        from: Attempt.collection.name,
        let: { quizId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$quiz_id', '$$quizId'] }, status: 'submitted' } },
          { $group: { _id: null, submissions: { $sum: 1 }, average_percentage: {
            $avg: { $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$score', '$total'] }, 100] }, 0] },
          } } },
        ],
        as: 'attempt_stats',
      },
    },
    {
      $addFields: {
        teacher_name: { $ifNull: [{ $first: '$teacher.name' }, 'Unknown teacher'] },
        teacher_email: { $ifNull: [{ $first: '$teacher.email' }, ''] },
        submissions: { $ifNull: [{ $first: '$attempt_stats.submissions' }, 0] },
        average_percentage: { $ifNull: [{ $first: '$attempt_stats.average_percentage' }, 0] },
        question_count: { $size: '$questions' },
      },
    },
    { $sort: { created_at: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              title: 1,
              description: 1,
              duration_minutes: 1,
              created_at: 1,
              created_by: 1,
              teacher_name: 1,
              teacher_email: 1,
              submissions: 1,
              average_percentage: { $round: ['$average_percentage', 1] },
              question_count: 1,
            },
          },
        ],
        count: [{ $count: 'total' }],
      },
    },
  ]);

  const total = result.count[0]?.total || 0;
  return res.json({
    items: result.items.map((quiz) => ({ ...quiz, id: toId(quiz), _id: undefined })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

router.get('/quizzes/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'quiz not found' });

  const quiz = await Quiz.findById(req.params.id).populate('created_by', 'name email');
  if (!quiz) return res.status(404).json({ error: 'quiz not found' });

  const attempts = await Attempt.find({ quiz_id: quiz._id })
    .populate('student_id', 'name email')
    .sort({ submitted_at: -1 });
  const submitted = attempts.filter((attempt) => attempt.status === 'submitted');
  const percentages = submitted.map((attempt) =>
    attempt.total ? (attempt.score / attempt.total) * 100 : 0
  );
  const average = percentages.length
    ? percentages.reduce((sum, percentage) => sum + percentage, 0) / percentages.length
    : 0;
  const durations = submitted
    .filter((attempt) => attempt.started_at && attempt.submitted_at)
    .map((attempt) => Math.max(0, (attempt.submitted_at - attempt.started_at) / 1000));

  const students = new Map();
  for (const attempt of submitted) {
    const studentId = toId(attempt.student_id);
    const percentage = attempt.total ? (attempt.score / attempt.total) * 100 : 0;
    const existing = students.get(studentId) || {
      student_id: studentId,
      student_name: attempt.student_id?.name || 'Unknown student',
      student_email: attempt.student_id?.email || '',
      attempts: 0,
      percentage_total: 0,
      best_score: attempt.score,
      best_total: attempt.total,
      best_percentage: percentage,
      last_submitted_at: attempt.submitted_at,
    };
    existing.attempts++;
    existing.percentage_total += percentage;
    if (percentage > existing.best_percentage) {
      existing.best_score = attempt.score;
      existing.best_total = attempt.total;
      existing.best_percentage = percentage;
    }
    if (attempt.submitted_at > existing.last_submitted_at) {
      existing.last_submitted_at = attempt.submitted_at;
    }
    students.set(studentId, existing);
  }

  const leaderboard = [...students.values()]
    .map(({ percentage_total, ...entry }) => ({
      ...entry,
      best_percentage: Math.round(entry.best_percentage * 10) / 10,
      average_percentage: Math.round((percentage_total / entry.attempts) * 10) / 10,
    }))
    .sort((a, b) => b.best_percentage - a.best_percentage || b.average_percentage - a.average_percentage);

  const questionStatistics = quiz.questions
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((question) => {
      let answered = 0;
      let correct = 0;
      for (const attempt of submitted) {
        const answer = attempt.answers.find((item) => toId(item.question_id) === toId(question));
        if (!answer) continue;
        answered++;
        const option = question.options.find((item) => toId(item) === toId(answer.option_id));
        if (option?.is_correct) correct++;
      }
      return {
        id: toId(question),
        text: question.text,
        answered,
        correct,
        correct_percentage: answered ? Math.round((correct / answered) * 1000) / 10 : 0,
      };
    });

  return res.json({
    quiz: {
      id: toId(quiz),
      title: quiz.title,
      description: quiz.description,
      duration_minutes: quiz.duration_minutes,
      question_count: quiz.questions.length,
      created_at: quiz.created_at,
      teacher_name: quiz.created_by?.name || 'Unknown teacher',
      teacher_email: quiz.created_by?.email || '',
    },
    statistics: {
      submissions: submitted.length,
      unique_students: students.size,
      in_progress: attempts.length - submitted.length,
      completion_rate: attempts.length ? Math.round((submitted.length / attempts.length) * 1000) / 10 : 0,
      average_percentage: Math.round(average * 10) / 10,
      highest_percentage: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : 0,
      lowest_percentage: percentages.length ? Math.round(Math.min(...percentages) * 10) / 10 : 0,
      average_duration_seconds: durations.length
        ? Math.round(durations.reduce((sum, seconds) => sum + seconds, 0) / durations.length)
        : 0,
    },
    leaderboard,
    question_statistics: questionStatistics,
  });
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name || !normalizedEmail || !password || !role) {
      return res.status(400).json({ error: 'All fields required: name, email, password, role' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.exists({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({
      email: normalizedEmail,
      password_hash,
      name: name.trim(),
      role,
    });

    return res.status(201).json(userResponse(user));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Admin create user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'user not found' });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (toId(user) === req.user.id) return res.status(400).json({ error: 'cannot update yourself' });

  const { role } = req.body;
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
  }

  user.role = role;
  await user.save();
  return res.json(userResponse(user));
});

router.delete('/users/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(404).json({ error: 'user not found' });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (toId(user) === req.user.id) return res.status(400).json({ error: 'cannot delete yourself' });

  const quizzes = await Quiz.find({ created_by: user._id }).select('_id');
  const quizIds = quizzes.map((quiz) => quiz._id);

  await Promise.all([
    Attempt.deleteMany({ $or: [{ student_id: user._id }, { quiz_id: { $in: quizIds } }] }),
    Quiz.deleteMany({ created_by: user._id }),
    User.deleteOne({ _id: user._id }),
  ]);

  return res.json({ message: 'user and related records deleted' });
});

export default router;
