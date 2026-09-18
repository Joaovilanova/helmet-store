const session = require('./session');

async function identifyUser(req, res, next) {
  req.user = await session.currentUser(req);
  next();
}

function requireAuthentication(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!req.user) return res.status(401).json({ message: 'Entre para continuar.' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  next();
}

function requireSafeRequest(req, res, next) {
  if (req.get('X-Helmet-Request') !== '1' || req.get('Sec-Fetch-Site') === 'cross-site'
    || (req.method !== 'DELETE' && !req.is('application/json'))) {
    return res.status(403).json({ message: 'Requisição não permitida.' });
  }
  next();
}

module.exports = { identifyUser, requireAuthentication, requireAdmin, requireSafeRequest };
