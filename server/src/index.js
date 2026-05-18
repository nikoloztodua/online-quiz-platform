// Online Quiz Platform — Backend Entry Point
// Authors: Nikoloz Todua, Iakobi Gogebashvili

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/init.js';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// მიდლვეარები — middleware
app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// დაცული endpoint — JWT-ის გადამოწმების ტესტი
app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    message: 'Authenticated successfully',
    user: req.user,
  });
});

// ჯანმრთელობის შემოწმება
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Quiz platform API is running',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});