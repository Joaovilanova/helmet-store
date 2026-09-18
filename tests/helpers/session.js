const { randomBytes, randomUUID, createHash } = require('node:crypto');

module.exports = async function testSession(sqlite, role) {
  const [user] = await sqlite.query(`INSERT INTO users (name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?) RETURNING id, email`, ['Test user', `${randomUUID()}@example.test`, 'unused-test-hash', role, new Date().toISOString()]);
  const token = randomBytes(32).toString('hex');
  await sqlite.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?) RETURNING user_id',
    [createHash('sha256').update(token).digest('hex'), user.id, Date.now() + 60000]);
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  return { ...user, cookie: `${secure ? '__Host-' : ''}helmet_session=${token}` };
};
