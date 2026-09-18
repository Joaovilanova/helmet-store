const fs = require('node:fs');
const path = require('node:path');

// A Vercel publica public/ pela CDN. frontend/src/ continua sendo a fonte.
const source = path.resolve(__dirname, '../frontend/src');
const destination = path.resolve(__dirname, '../public');

fs.cpSync(source, destination, { recursive: true });
console.log('Frontend preparado em public/ para a Vercel.');
