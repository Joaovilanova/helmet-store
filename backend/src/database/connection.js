const path = require('node:path');
const os = require('node:os');

let database;

// Importar o app não acessa o banco. Falhas de PostgreSQL não ativam SQLite.
async function query(statement, parameters = []) {
  if (!database) {
    if (process.env.DATABASE_URL) {
      database = require('./postgres')(process.env.DATABASE_URL);
    } else {
      const filename = process.env.VERCEL === '1'
        ? path.join(os.tmpdir(), 'helmet-store.db')
        : path.resolve(__dirname, '../../../database/helmet-store.db');
      database = require('./sqlite')(filename);
    }
  }
  return database.query(statement, parameters);
}

module.exports = { query };
