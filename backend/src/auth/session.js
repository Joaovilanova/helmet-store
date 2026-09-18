const { randomBytes, createHash } = require('node:crypto');
const db = require('../database/connection');
const duration = 7 * 24 * 60 * 60 * 1000;
const secure = () => process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const cookieName = () => secure() ? '__Host-helmet_session' : 'helmet_session';
const cookieOptions = () => ({ httpOnly: true, secure: secure(), sameSite: 'lax', path: '/' });
const digest = token => createHash('sha256').update(token).digest('hex');

function readToken(req) {
  const matches = (req.headers.cookie || '').split(';').map(part => part.trim())
    .filter(part => part.startsWith(`${cookieName()}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(cookieName().length + 1);
  return /^[a-f0-9]{64}$/.test(value) ? value : null;
}

async function revoke(req) {
  const token = readToken(req);
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = ? RETURNING token_hash', [digest(token)]);
}

async function create(req, res, userId) {
  await revoke(req);
  await db.query('DELETE FROM sessions WHERE expires_at <= ? RETURNING token_hash', [Date.now()]);
  const token = randomBytes(32).toString('hex');
  await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?) RETURNING user_id',
    [digest(token), userId, Date.now() + duration]);
  res.cookie(cookieName(), token, { ...cookieOptions(), maxAge: duration });
}

async function currentUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const rows = await db.query(`SELECT u.id, u.name, u.email, u.role FROM users u
    JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?`, [digest(token), Date.now()]);
  return rows[0] || null;
}

function clear(res) { res.clearCookie(cookieName(), cookieOptions()); }

module.exports = { create, currentUser, revoke, clear, digest };
