const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const seed = require('../backend/src/database/seed');

test('Seleção por ambiente e ausência de fallback após falha PostgreSQL', async () => {
  const connectionPath = require.resolve('../backend/src/database/connection');
  const sqlitePath = require.resolve('../backend/src/database/sqlite');
  const postgresPath = require.resolve('../backend/src/database/postgres');
  const sqliteFactory = require(sqlitePath);
  const postgresFactory = require(postgresPath);
  const previousUrl = process.env.DATABASE_URL;
  const previousVercel = process.env.VERCEL;
  let sqliteCalls = 0;
  let postgresCalls = 0;
  require.cache[sqlitePath].exports = filename => {
    sqliteCalls++;
    assert.equal(filename, path.resolve(__dirname, '../database/helmet-store.db'));
    return { query: async () => [] };
  };
  require.cache[postgresPath].exports = () => {
    postgresCalls++;
    return { query: async () => { throw new Error('Falha simulada'); } };
  };
  try {
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
    delete require.cache[connectionPath];
    await require(connectionPath).query('SELECT * FROM products');
    assert.equal(sqliteCalls, 1);
    assert.equal(postgresCalls, 0);
    process.env.DATABASE_URL = 'valor-simulado-sem-conexao';
    delete require.cache[connectionPath];
    await assert.rejects(require(connectionPath).query('SELECT * FROM products'));
    assert.equal(sqliteCalls, 1);
    assert.equal(postgresCalls, 1);
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    require.cache[sqlitePath].exports = sqliteFactory;
    require.cache[postgresPath].exports = postgresFactory;
    delete require.cache[connectionPath];
  }
});

test('SQLite isolado: seed, CRUD HTTP, validações e erros seguros', async () => {
  const filename = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'helmet-sqlite-')), 'test.db');
  const createSqlite = require('../backend/src/database/sqlite');
  let sqlite = createSqlite(filename);
  assert.deepEqual(await sqlite.query('SELECT * FROM products ORDER BY id'), seed.map((p, i) => ({ id: i + 1, ...p })));
  sqlite.close();
  sqlite = createSqlite(filename);
  assert.equal((await sqlite.query('SELECT * FROM products')).length, 4);

  const connection = require('../backend/src/database/connection');
  const originalQuery = connection.query;
  connection.query = sqlite.query;
  const admin = await require('./helpers/session')(sqlite, 'admin');
  const app = require('../api/index');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, route, status, body) {
    const res = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', 'X-Helmet-Request': '1', Cookie: admin.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(res.status, status, `${method} ${route}`);
    return res.json();
  }
  try {
    assert.equal((await fetch(base)).status, 200);
    assert.equal((await request('GET', '/api/health', 200)).message, 'API Helmet Store funcionando!');
    assert.equal((await request('GET', '/api/products', 200)).length, 4);
    assert.equal((await request('GET', '/api/products/1', 200)).name, seed[0].name);
    const data = { name: "Teste ' ? $1", description: 'Teste', price: 12.5, stock: 0, category: 'Teste' };
    const created = await request('POST', '/api/products', 201, data);
    assert.deepEqual(created, { id: created.id, ...data });
    const invalid = [{}];
    for (const key of Object.keys(data)) {
      const missing = { ...data }; delete missing[key]; invalid.push(missing);
    }
    for (const field of ['name', 'description', 'category']) {
      for (const value of ['', '   ', null, 2]) invalid.push({ ...data, [field]: value });
    }
    for (const price of [0, -1, '1', null]) invalid.push({ ...data, price });
    for (const stock of [-1, 1.5, '1', null]) invalid.push({ ...data, stock });
    for (const body of invalid) {
      await request('POST', '/api/products', 400, body);
      await request('PUT', `/api/products/${created.id}`, 400, body);
    }
    await request('POST', '/api/products', 400);
    const updated = { ...data, stock: 9, price: 42 };
    assert.deepEqual(await request('PUT', `/api/products/${created.id}`, 200, updated), { id: created.id, ...updated });
    await request('DELETE', `/api/products/${created.id}`, 200);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      await request(method, `/api/products/${created.id}`, 404, method === 'PUT' ? data : undefined);
      for (const id of ['0', '-1', 'abc', '1.2', '9007199254740992']) {
        await request(method, `/api/products/${id}`, 400, method === 'PUT' ? data : undefined);
      }
    }
    assert.equal((await request('GET', '/api/products', 200)).length, 4);
    connection.query = async () => { throw new Error('DATABASE_URL senha host SENTINELA_PRIVADA'); };
    assert.deepEqual(await request('GET', '/api/products', 500), {
      message: 'Não foi possível concluir a operação. Tente novamente.',
    });
    const malformed = await fetch(base + '/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
  } finally {
    connection.query = originalQuery;
    await new Promise(resolve => server.close(resolve));
    sqlite.close();
  }
});

test('Neon: driver real com transporte HTTP simulado, sem rede/credenciais reais', async () => {
  const { neonConfig } = require('@neondatabase/serverless');
  const originalFetch = neonConfig.fetchFunction;
  const batches = [];
  const queries = [];
  let fail = false;
  const empty = { fields: [], rows: [], rowCount: 0, command: 'SELECT' };
  neonConfig.fetchFunction = async (_url, options) => {
    if (fail) { fail = false; throw new Error('Falha simulada'); }
    const body = JSON.parse(options.body);
    if (body.queries) {
      batches.push(body);
      return Response.json({ results: body.queries.map(() => empty) });
    }
    queries.push(body);
    if (body.query.includes('FROM users')) {
      return Response.json({
        fields: [{ name: 'id', dataTypeID: 20 }, { name: 'name', dataTypeID: 25 },
          { name: 'email', dataTypeID: 25 }, { name: 'role', dataTypeID: 25 }],
        rows: [['1', 'Pessoa', 'person@example.test', 'customer']], rowCount: 1, command: 'SELECT',
      });
    }
    return Response.json({
      fields: [{ name: 'id', dataTypeID: 20 }, { name: 'price', dataTypeID: 701 }, { name: 'stock', dataTypeID: 20 }],
      rows: [['1', '249.9', '12']], rowCount: 1, command: 'SELECT',
    });
  };
  try {
    // Domínio reservado e identidade fictícia; o transporte nunca acessa rede.
    const address = new URL('postgresql://example.invalid/helmet_test');
    address.username = 'test';
    const createPostgres = require('../backend/src/database/postgres');
    const pg = createPostgres(address.href);
    const results = await Promise.all([
      pg.query('SELECT * FROM products WHERE id = ?', [1]),
      pg.query('SELECT * FROM products WHERE name = ?', ["name '?'"]),
    ]);
    assert.deepEqual(results[0], [{ id: 1, price: 249.9, stock: 12 }]);
    assert.equal(batches.length, 1);
    assert.match(batches[0].queries[0].query, /pg_advisory_xact_lock/);
    assert.match(batches[0].queries[1].query, /CREATE TABLE IF NOT EXISTS/);
    assert.match(batches[0].queries[2].query, /WHERE NOT EXISTS/);
    assert.deepEqual(JSON.parse(batches[0].queries[2].params[0]), seed);
    assert.equal(queries[0].query, 'SELECT * FROM products WHERE id = $1');
    assert.equal(queries[1].params[0], "name '?'");
    const schema = batches[0].queries.map(item => item.query).join('\n');
    assert.match(schema, /CREATE TABLE IF NOT EXISTS users/);
    assert.match(schema, /email TEXT NOT NULL UNIQUE/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS sessions/);
    assert.match(schema, /CREATE TABLE IF NOT EXISTS auth_limits/);
    const users = await pg.query('SELECT id, name, email, role FROM users WHERE email = ?', ['person@example.test']);
    assert.deepEqual(users, [{ id: 1, name: 'Pessoa', email: 'person@example.test', role: 'customer' }]);
    const retry = createPostgres(address.href);
    fail = true;
    await assert.rejects(retry.query('SELECT * FROM products'));
    await retry.query('SELECT * FROM products');
    assert.equal(batches.length, 2);
  } finally {
    neonConfig.fetchFunction = originalFetch;
  }
});
