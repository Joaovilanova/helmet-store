const fs = require('node:fs');
const path = require('node:path');

// A Vercel publica public/ pela CDN. frontend/src/ continua sendo a fonte.
const source = path.resolve(__dirname, '../frontend/src');
const destination = path.resolve(__dirname, '../public');

fs.cpSync(source, destination, { recursive: true });
// Falhe no build se algum arquivo essencial não for publicado.
for (const file of ['index.html', 'css/styles.css', 'js/app.js']) {
  if (!fs.statSync(path.join(destination, file)).isFile()) {
    throw new Error(`Arquivo obrigatório ausente no frontend: ${file}`);
  }
}
console.log('Frontend preparado em public/ para a Vercel.');
