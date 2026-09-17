const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API Helmet Store funcionando!' });
});

app.listen(port, () => {
  console.log(`API Helmet Store executando na porta ${port}`);
});
