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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`API Helmet Store executando na porta ${port}`);
  });
}

module.exports = app;
