const Database = require('better-sqlite3');
const products = require('./seed');

module.exports = function createSqlite(filename) {
  const db = new Database(filename);
  try {
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
    db.transaction(() => {
      if (db.prepare('SELECT COUNT(*) AS count FROM products').get().count > 0) return;
      const insert = db.prepare(`
        INSERT INTO products (name, description, price, stock, category)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const p of products) insert.run(p.name, p.description, p.price, p.stock, p.category);
    }).immediate();
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    async query(statement, parameters = []) {
      return db.prepare(statement).all(...parameters);
    },
    close() { db.close(); },
  };
};
