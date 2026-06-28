import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'admin'],
  },
  created_at: { type: Date, default: Date.now },
});

const optionSchema = new Schema({
  text: { type: String, required: true, trim: true },
  is_correct: { type: Boolean, required: true, default: false },
});

const questionSchema = new Schema({
  text: { type: String, required: true, trim: true },
  order_index: { type: Number, required: true, default: 0 },
  options: { type: [optionSchema], default: [] },
});

const quizSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  duration_minutes: { type: Number, required: true, min: 1, max: 180, default: 10 },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questions: { type: [questionSchema], default: [] },
  created_at: { type: Date, default: Date.now },
});

const answerSchema = new Schema({
  question_id: { type: Schema.Types.ObjectId, required: true },
  option_id: { type: Schema.Types.ObjectId, required: true },
});

const attemptSchema = new Schema({
  quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
  answers: { type: [answerSchema], default: [] },
  status: { type: String, enum: ['in_progress', 'submitted'], default: 'submitted' },
  started_at: { type: Date, default: Date.now },
  expires_at: { type: Date },
  submitted_at: { type: Date },
});

export const User = mongoose.model('User', userSchema);
export const Quiz = mongoose.model('Quiz', quizSchema);
export const Attempt = mongoose.model('Attempt', attemptSchema);

export function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function toId(value) {
  return value?._id?.toString?.() || value?.toString?.() || value;
}

export async function connectDb() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/online_quiz_platform';
  await mongoose.connect(uri);
  console.log(`Database connected at ${uri}`);
}
