// Online Quiz Platform — JWT Authentication Middleware
// Authors: Nikoloz Todua, Iakobi Gogebashvili
//
// requireAuth — ამოწმებს, რომ request-ს თან ახლავს valid JWT token
//
// გამოყენების მაგალითი route-ში:
//   router.get('/me', requireAuth, (req, res) => { ... });
//
// წარმატების შემთხვევაში: req.user = { id, email, role } — ეს ხელმისაწვდომია მომდევნო handler-ში
// წარუმატებლობის შემთხვევაში: 401 Unauthorized

import { verifyToken } from '../utils/auth.js';

export function requireAuth(req, res, next) {
  // Header-ის წაკითხვა — სტანდარტული ფორმატია: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  // Bearer prefix-ის გადამოწმება და token-ის ამოღება
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Expected: Bearer <token>' });
  }

  const token = parts[1];

  // Token-ის გადამოწმება — verifyToken გადააგდებს error-ს თუ ცუდია/ვადაგასულია
  try {
    const payload = verifyToken(token);

    // req.user — ხელმისაწვდომი იქნება მომდევნო handler-ში
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();   // ვაგრძელებთ მომდევნო middleware/handler-ზე
  } catch (err) {
    // jwt.verify გადააგდებს ერორებს: TokenExpiredError, JsonWebTokenError, etc.
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// requireRole — role-based access control
// გამოყენების მაგალითი: router.post('/quiz', requireAuth, requireRole('teacher'), handler);
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}