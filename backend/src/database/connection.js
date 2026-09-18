const Database = require('better-sqlite3');
const path = require('node:path');
const os = require('node:os');

// Na Vercel, SQLite serve apenas como demonstração temporária por instância.
// O banco local permanece no caminho original e não é copiado nem alterado.
const databasePath = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'helmet-store.db')
  : path.resolve(__dirname, '../../../database/helmet-store.db');
const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    category TEXT NOT NULL
  )
`);

const seedProducts = db.transaction(() => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO products (name, description, price, stock, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  insert.run('Aurora Urbano', 'Capacete fictício para trajetos urbanos.', 249.90, 12, 'Aberto');
  insert.run('Nebulosa Integral', 'Capacete integral fictício para demonstração.', 459.90, 8, 'Integral');
  insert.run('Horizonte Modular', 'Capacete modular fictício para demonstração.', 599.90, 5, 'Modular');
  insert.run('Cometa Trilha', 'Capacete fictício inspirado em aventuras de trilha.', 389.90, 10, 'Off-road');
});

seedProducts();

module.exports = db;
