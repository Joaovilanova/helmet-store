const express = require('express');
const path = require('node:path');
const productsRoutes = require('./routes/products');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/products', productsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'API Helmet Store funcionando!' });
});

app.use(express.static(path.resolve(__dirname, '../../frontend/src')));

// Express 5 encaminha rejeições async para cá. Não exponha erros do driver.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido.' });
  }
  res.status(500).json({ message: 'Não foi possível concluir a operação. Tente novamente.' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API Helmet Store executando na porta ${port}`);
  });
}

module.exports = app;
