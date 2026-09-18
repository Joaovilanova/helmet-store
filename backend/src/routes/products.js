const express = require('express');
const db = require('../database/connection');

const router = express.Router();

router.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'O ID deve ser um número inteiro positivo.' });
  }
  req.productId = id;
  next();
});

function validateProduct(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Informe os dados do produto em um objeto JSON.';
  }
  for (const field of ['name', 'description', 'category']) {
    if (typeof data[field] !== 'string' || data[field].trim().length === 0) {
      return `O campo ${field} deve ser uma string não vazia.`;
    }
  }
  if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price <= 0) {
    return 'O campo price deve ser um número maior que zero.';
  }
  if (!Number.isSafeInteger(data.stock) || data.stock < 0) {
    return 'O campo stock deve ser um número inteiro maior ou igual a zero dentro do limite seguro.';
  }
  return null;
}

const findProduct = db.prepare('SELECT * FROM products WHERE id = ?');

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = findProduct.get(req.productId);

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  res.json(product);
});

router.post('/', (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, description, price, stock, category } = req.body;
  const result = db.prepare(`
    INSERT INTO products (name, description, price, stock, category)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, description, price, stock, category);

  res.status(201).json(findProduct.get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  if (!findProduct.get(req.productId)) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const { name, description, price, stock, category } = req.body;
  db.prepare(`
    UPDATE products
    SET name = ?, description = ?, price = ?, stock = ?, category = ?
    WHERE id = ?
  `).run(name, description, price, stock, category, req.productId);

  res.json(findProduct.get(req.productId));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.productId);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  res.json({ message: 'Produto excluído com sucesso.' });
});

module.exports = router;
