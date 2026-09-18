const express = require('express');
const products = require('../database/products');
const { identifyUser, requireAuthentication, requireAdmin, requireSafeRequest } = require('../auth/middleware');

const router = express.Router();

const adminAccess = [identifyUser, requireAuthentication, requireAdmin, requireSafeRequest];
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) return adminRouter(req, res, next);
  next();
});
const adminRouter = express.Router();
adminRouter.use(...adminAccess);

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

router.get('/', async (req, res) => {
  res.json(await products.list());
});

router.get('/:id', async (req, res) => {
  const product = await products.find(req.productId);

  if (!product) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  res.json(product);
});

router.post('/', async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  res.status(201).json(await products.create(req.body));
});

router.put('/:id', async (req, res) => {
  if (!await products.find(req.productId)) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const product = await products.update(req.productId, req.body);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  if (!await products.remove(req.productId)) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  res.json({ message: 'Produto excluído com sucesso.' });
});

module.exports = router;
