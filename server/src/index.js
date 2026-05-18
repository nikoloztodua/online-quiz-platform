// Online Quiz Platform — Backend Entry Point
// Authors: Nikoloz Todua, Iakobi Gogebashvili

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// მიდლვეარები — middleware
app.use(cors());                  // ფრონტენდს localhost:5173-დან რომ მოგვაკითხოს
app.use(express.json());          // JSON body parsing

// ჯანმრთელობის შემოწმება — health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Quiz platform API is running',
    timestamp: new Date().toISOString(),
  });
});

// სერვერის გაშვება — start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});