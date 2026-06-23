import express from 'express';
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
