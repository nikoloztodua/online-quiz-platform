// Online Quiz Platform — Authentication utilities
// Authors: Nikoloz Todua, Iakobi Gogebashvili
//
// აქ ვწერთ ფუნქციებს, რომლებიც გამოიყენება auth route-ებში:
//   - password hashing/verification (bcryptjs)
//   - JWT token signing/verification (jsonwebtoken)

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ============================================================
// PASSWORD HASHING
// ============================================================

// პაროლის ჰეშირება — bcrypt 10 round-ით (default-ი, საკმარისად მძლავრი)
// არასოდეს ვინახავთ პაროლს plain text-ით ბაზაში
export async function hashPassword(plainPassword) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(plainPassword, saltRounds);
  return hash;
}

// პაროლის შემოწმება — true/false აბრუნებს
// bcrypt თვითონ აღმოაჩენს ჰეშში ჩაშენებულ salt-ს და შეადარებს
export async function verifyPassword(plainPassword, storedHash) {
  const match = await bcrypt.compare(plainPassword, storedHash);
  return match;
}

// ============================================================
// JWT TOKEN HANDLING
// ============================================================

// JWT-ის ხელმოწერა — payload-ში ვინახავთ user id, role, email
// მოქმედების ვადა: 7 დღე (განვლის შემდეგ user-ი ხელახლა შევა)
export function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in .env');
  }

  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  return token;
}

// JWT-ის გადამოწმება — წარმატების შემთხვევაში აბრუნებს payload-ს
// თუ token არასწორი ან ვადაგასულია — გადააგდებს error-ს
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in .env');
  }

  const payload = jwt.verify(token, secret);
  return payload;
}
