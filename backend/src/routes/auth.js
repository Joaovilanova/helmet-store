const express = require('express');
const { createHash } = require('node:crypto');
const db = require('../database/connection');
const { hashPassword, verifyPassword } = require('../auth/password');
const session = require('../auth/session');
const router = express.Router();
const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // Cabeçalho não simples exige preflight cross-origin; não habilitamos CORS.
  if (req.method === 'POST' && (req.get('X-Helmet-Request') !== '1'
    || req.get('Sec-Fetch-Site') === 'cross-site' || !req.is('application/json'))) {
    return res.status(403).json({ message: 'Requisição não permitida.' });
  }
  next();
});

function credentials(body, register = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (email.length > 120 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) return null;
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 72) return null;
  if (register && (name.length < 2 || name.length > 60)) return null;
  return { name, email, password: body.password };
}

async function allowed(email, action) {
  const now = Date.now();
  const key = createHash('sha256').update(`${action}:${email}`).digest('hex');
  await db.query('DELETE FROM auth_limits WHERE expires_at <= ? RETURNING key', [now]);
  const [limit] = await db.query(`INSERT INTO auth_limits (key, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET hits = auth_limits.hits + 1 RETURNING hits`, [key, now + 15 * 60 * 1000]);
  return limit.hits <= 20;
}

router.post('/register', async (req, res) => {
  const data = credentials(req.body, true);
  if (!data) return res.status(400).json({ message: 'Confira nome (2–60), e-mail e senha (8–72 caracteres).' });
  if (!await allowed(data.email, 'register')) return res.status(429).json({ message: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  const hash = await hashPassword(data.password);
  const [user] = await db.query(`INSERT INTO users (name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, 'customer', ?) ON CONFLICT (email) DO NOTHING RETURNING id, name, email, role`,
  [data.name, data.email, hash, new Date().toISOString()]);
  if (!user) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
  res.status(201).json({ message: 'Cadastro concluído. Entre com seu e-mail e senha.', user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const data = credentials(req.body);
  if (!data) return res.status(400).json({ message: 'Informe um e-mail válido e uma senha de 8 a 72 caracteres.' });
  if (!await allowed(data.email, 'login')) return res.status(429).json({ message: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  const [user] = await db.query('SELECT id, name, email, role, password_hash FROM users WHERE email = ?', [data.email]);
  const matches = await verifyPassword(data.password, user?.password_hash);
  if (!user || !matches) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  await session.create(req, res, user.id);
  res.json({ message: 'Login concluído.', user: publicUser(user) });
});

router.get('/me', async (req, res) => {
  const user = await session.currentUser(req);
  if (!user) {
    session.clear(res);
    return res.status(401).json({ message: 'Entre para acessar sua conta.' });
  }
  res.json({ user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  await session.revoke(req);
  session.clear(res);
  res.json({ message: 'Você saiu da sua conta.' });
});

module.exports = router;
