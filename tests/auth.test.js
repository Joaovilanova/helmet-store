const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Autenticação HTTP com SQLite isolado e sessões persistentes', async t => {
  const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'helmet-auth-')), 'test.db');
  let sqlite = require('../backend/src/database/sqlite')(filename);
  const connection = require('../backend/src/database/connection');
  const originalQuery = connection.query;
  connection.query = sqlite.query;
  const previousEnv = process.env.NODE_ENV;
  const previousVercel = process.env.VERCEL;
  process.env.NODE_ENV = 'production';
  const server = require('../api/index').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = { name: '  Pessoa Teste  ', email: ' PERSON@example.test ', password: 'Senha-teste-123', role: 'admin' };
  let cookie;
  let user;
  async function request(route, status, body, token = cookie, custom = true) {
    const response = await fetch(base + '/api/auth/' + route, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(custom ? { 'X-Helmet-Request': '1' } : {}), ...(token ? { Cookie: token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, route);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(data), /password|password_hash|token_hash|DATABASE_URL|Senha-teste|scrypt\$/);
    if (data.user) assert.deepEqual(Object.keys(data.user).sort(), ['email', 'id', 'name', 'role']);
    return { response, data };
  }
  try {
    await t.test('me sem autenticação', () => request('me', 401));
    await t.test('cadastro inválido e bloqueio CSRF', async () => {
      for (const data of [{}, { ...profile, name: ' ' }, { ...profile, name: 'a' }, { ...profile, name: 'a'.repeat(61) },
        { ...profile, email: 'inválido' }, { ...profile, email: 'a'.repeat(121) + '@x.test' },
        { ...profile, password: 'short' }, { ...profile, password: 'a'.repeat(73) }]) await request('register', 400, data);
      await request('register', 403, profile, null, false);
    });
    await t.test('cadastro válido, role fixa e hash seguro', async () => {
      const result = await request('register', 201, profile);
      user = result.data.user;
      assert.equal(user.role, 'customer'); assert.equal(user.email, 'person@example.test'); assert.equal(user.name, 'Pessoa Teste');
      const [stored] = await sqlite.query('SELECT * FROM users WHERE id = ?', [user.id]);
      assert.match(stored.password_hash, /^scrypt\$131072\$8\$1\$/);
      assert.notEqual(stored.password_hash, profile.password);
      assert(stored.created_at);
    });
    await t.test('email duplicado normalizado', () => request('register', 409, { ...profile, email: 'person@example.test' }));
    await t.test('login incorreto não distingue email e senha', async () => {
      const one = await request('login', 401, { ...profile, password: 'Outra-senha' });
      const two = await request('login', 401, { ...profile, email: 'missing@example.test' });
      assert.deepEqual(one.data, two.data);
      await request('login', 400, { email: 'bad', password: 'short' });
    });
    await t.test('login, cookie seguro, token somente em cookie e me', async () => {
      const { response } = await request('login', 200, profile);
      const setCookie = response.headers.get('set-cookie');
      assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Lax/);
      assert.match(setCookie, /^__Host-helmet_session=/);
      cookie = setCookie.split(';')[0];
      const [stored] = await sqlite.query('SELECT * FROM sessions');
      assert.notEqual(stored.token_hash, cookie.split('=')[1]);
      assert.deepEqual((await request('me', 200)).data.user, user);
    });
    await t.test('sessão sobrevive à reabertura do banco e login rotaciona cookie', async () => {
      sqlite.close(); sqlite = require('../backend/src/database/sqlite')(filename); connection.query = sqlite.query;
      assert.deepEqual((await request('me', 200)).data.user, user);
      const old = cookie;
      cookie = (await request('login', 200, profile)).response.headers.get('set-cookie').split(';')[0];
      assert.notEqual(cookie, old);
      await request('me', 401, undefined, old);
    });
    await t.test('logout revoga a sessão', async () => {
      assert.match((await request('logout', 200, {})).response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
      await request('me', 401);
      await request('logout', 200, {});
    });
    await t.test('sessão expirada e token adulterado são rejeitados', async () => {
      cookie = (await request('login', 200, profile)).response.headers.get('set-cookie').split(';')[0];
      await sqlite.query('UPDATE sessions SET expires_at = 0 RETURNING user_id');
      await request('me', 401);
      await request('me', 401, undefined, '__Host-helmet_session=invalid');
    });
    await t.test('limite de tentativas persistido e erros internos sanitizados', async () => {
      const key = require('node:crypto').createHash('sha256').update('login:person@example.test').digest('hex');
      await sqlite.query('UPDATE auth_limits SET hits = 20 WHERE key = ? RETURNING hits', [key]);
      await request('login', 429, profile);
      connection.query = async () => { throw new Error('DATABASE_URL host senha segredo'); };
      const result = await request('register', 500, profile);
      assert.equal(result.data.message, 'Não foi possível concluir a operação. Tente novamente.');
      connection.query = sqlite.query;
    });
    await t.test('cookie local e frontend/produtos preservados', async () => {
      process.env.NODE_ENV = 'development'; delete process.env.VERCEL;
      const local = await request('me', 401, undefined, null);
      assert.match(local.response.headers.get('set-cookie'), /^helmet_session=/);
      assert.doesNotMatch(local.response.headers.get('set-cookie'), /; Secure/);
      for (const route of ['/', '/js/auth.js', '/api/health', '/api/products', '/api/products/1']) assert.equal((await fetch(base + route)).status, 200);
    });
  } finally {
    await new Promise(resolve => server.close(resolve)); sqlite.close(); connection.query = originalQuery;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
  }
});
