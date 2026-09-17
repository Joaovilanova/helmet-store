const express = require('express');
const productsRoutes = require('./routes/products');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/products', productsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Helmet Store funcionando!' });
});

app.listen(port, () => {
  console.log(`API Helmet Store executando na porta ${port}`);
});
