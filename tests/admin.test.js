const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('Autorização administrativa e promoção isoladas', async t => {
  const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'helmet-admin-')), 'test.db');
  const sqlite = require('../backend/src/database/sqlite')(filename);
  const db = require('../backend/src/database/connection');
  const original = db.query; db.query = sqlite.query;
  const customer = await require('./helpers/session')(sqlite, 'customer');
  const admin = await require('./helpers/session')(sqlite, 'admin');
  const server = require('../api/index').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const data = { name: 'Admin test', description: 'Test product', price: 25, stock: 1, category: 'Test' };
  async function request(method, route, status, cookie, body, headers = {}) {
    const res = await fetch(base + route, { method,
      headers: { 'Content-Type': 'application/json', 'X-Helmet-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(res.status, status, `${method} ${route}`);
    const json = await res.json();
    assert.doesNotMatch(JSON.stringify(json), /password_hash|token_hash|DATABASE_URL/);
    return json;
  }
  try {
    await t.test('GET lista e detalhe públicos', async () => {
      assert.equal((await request('GET', '/api/products', 200)).length, 4);
      assert.equal((await request('GET', '/api/products/1', 200)).id, 1);
    });
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const route = method === 'POST' ? '/api/products' : '/api/products/1';
      await t.test(`anônimo não pode ${method}`, () => request(method, route, 401, null, data));
      await t.test(`customer não pode ${method} nem forjar role`, () => request(method, route, 403, customer.cookie, { ...data, role: 'admin' }, { 'X-Role': 'admin' }));
    }
    let created;
    await t.test('admin pode POST', async () => { created = await request('POST', '/api/products', 201, admin.cookie, data); });
    await t.test('admin pode PUT', async () => {
      assert.equal((await request('PUT', `/api/products/${created.id}`, 200, admin.cookie, { ...data, stock: 8 })).stock, 8);
    });
    await t.test('admin pode DELETE', () => request('DELETE', `/api/products/${created.id}`, 200, admin.cookie));
    await t.test('validações e proteção CSRF preservadas', async () => {
      await request('POST', '/api/products', 400, admin.cookie, { ...data, price: -1 });
      await request('PUT', '/api/products/invalid', 400, admin.cookie, data);
      await request('DELETE', '/api/products/999999', 404, admin.cookie);
      await request('POST', '/api/products', 403, admin.cookie, data, { 'X-Helmet-Request': '' });
      await request('DELETE', '/api/products/1', 403, admin.cookie, undefined, { 'Sec-Fetch-Site': 'cross-site' });
    });
    await t.test('promoção altera somente role; inexistente não é criado', async () => {
      const { promoteAdmin } = require('../scripts/promote-admin');
      const [before] = await sqlite.query('SELECT * FROM users WHERE id = ?', [customer.id]);
      assert.equal(await promoteAdmin(` ${customer.email.toUpperCase()} `, sqlite.query), true);
      const [after] = await sqlite.query('SELECT * FROM users WHERE id = ?', [customer.id]);
      assert.deepEqual(after, { ...before, role: 'admin' });
      assert.equal(await promoteAdmin('missing@example.test', sqlite.query), false);
      await assert.rejects(promoteAdmin('invalid', sqlite.query));
      assert.equal((await request('GET', '/api/auth/me', 200, customer.cookie)).user.role, 'admin');
    });
    await t.test('rebaixamento invalida autorização mesmo com sessão existente', async () => {
      await sqlite.query("UPDATE users SET role = 'customer' WHERE id = ? RETURNING id", [admin.id]);
      await request('POST', '/api/products', 403, admin.cookie, data);
      assert.equal((await request('GET', '/api/products', 200)).length, 4);
    });
  } finally {
    await new Promise(resolve => server.close(resolve)); sqlite.close(); db.query = original;
  }
});
