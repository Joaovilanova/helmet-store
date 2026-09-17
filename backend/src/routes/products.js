const express = require('express');
const db = require('../database/connection');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  res.json(product);
});

module.exports = router;
