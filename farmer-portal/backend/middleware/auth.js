/**
 * Authentication middleware.
 * Login tokens are signed JWTs. The frontend keeps the token in localStorage
 * and sends it as "Authorization: Bearer <token>".
 */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const EXPIRY = '7d';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Any logged-in user (farmer or admin). */
function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

/** Farmer-only routes. */
function requireFarmer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'This page is only for farmer accounts.' });
    next();
  });
}

/** Admin-only routes (protects the admin dashboard APIs). */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
    next();
  });
}

module.exports = { signToken, requireAuth, requireFarmer, requireAdmin };
