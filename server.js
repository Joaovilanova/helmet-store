const express = require('express');
const backend = require('./backend/src/server');

// A Vercel detecta Express neste entry point; as rotas ficam no backend.
const app = express();
app.use(backend);

module.exports = app;
