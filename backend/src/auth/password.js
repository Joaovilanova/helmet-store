const { scrypt, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const dummySalt = randomBytes(16).toString('hex');

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, options);
  return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  const valid = parts.length === 6 && parts.slice(0, 4).join('$') === 'scrypt$131072$8$1'
    && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
  // Mesmo custo de derivação para usuário inexistente ou hash inválido.
  const actual = await derive(password, valid ? parts[4] : dummySalt, 64, options);
  const expected = valid ? Buffer.from(parts[5], 'hex') : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && valid;
}

module.exports = { hashPassword, verifyPassword };
