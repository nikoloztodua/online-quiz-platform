// Online Quiz Platform — Database initialization
// Authors: Nikoloz Todua, Iakobi Gogebashvili

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module-ში __dirname-ის ანალოგი
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// მონაცემთა ბაზის ფაილი — quiz.db inside server/data/
const dbPath = path.join(__dirname, '..', '..', 'data', 'quiz.db');

// better-sqlite3 — სინქრონული, ანუ ჩვეულებრივი ფუნქციებივით იწერება
const db = new Database(dbPath);

// საჭიროა Foreign Key constraints-ის ჩასართველად — SQLite-ში default-ად გამორთულია
db.pragma('foreign_keys = ON');

// სქემის შექმნა — schema creation
// IF NOT EXISTS ნიშნავს, რომ ცხრილი მხოლოდ პირველ გაშვებაზე იქმნება
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    created_by  INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id     INTEGER NOT NULL,
    text        TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS options (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    text        TEXT NOT NULL,
    is_correct  INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id      INTEGER NOT NULL,
    student_id   INTEGER NOT NULL,
    score        INTEGER NOT NULL DEFAULT 0,
    total        INTEGER NOT NULL DEFAULT 0,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS answers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id  INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    option_id   INTEGER NOT NULL,
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
  );
`;

db.exec(schema);
console.log('✅ Database initialized at', dbPath);

export default db;