const path = require('node:path');

async function promoteAdmin(argument, execute) {
  const email = typeof argument === 'string' ? argument.trim().toLowerCase() : '';
  if (email.length > 120 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    throw new Error('Informe um e-mail válido como único argumento.');
  }
  const statement = "UPDATE users SET role = 'admin' WHERE email = ? RETURNING id";
  let sqlite;
  try {
    if (!execute) {
      // Não executa migrations ou seeds: altera somente a role de usuário existente.
      if (process.env.DATABASE_URL) {
        const sql = require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
        execute = (text, params) => sql.query(text.replace('?', '$1'), params);
      } else {
        const Database = require('better-sqlite3');
        sqlite = new Database(path.resolve(__dirname, '../database/helmet-store.db'), { fileMustExist: true });
        execute = async (text, params) => sqlite.prepare(text).all(...params);
      }
    }
    const rows = await execute(statement, [email]);
    return rows.length > 0;
  } finally { sqlite?.close(); }
}

async function main(args = process.argv.slice(2)) {
  if (args.length !== 1) {
    console.error('Uso: node scripts/promote-admin.js <email>');
    return 1;
  }
  try {
    if (!await promoteAdmin(args[0])) {
      console.error('Usuário não encontrado. Nenhum usuário foi criado.');
      return 1;
    }
    console.log('Usuário existente promovido para admin.');
    return 0;
  } catch {
    console.error('Não foi possível promover. Verifique o e-mail, o ambiente e o acesso ao banco.');
    return 1;
  }
}

if (require.main === module) main().then(code => { process.exitCode = code; });
module.exports = { promoteAdmin, main };
