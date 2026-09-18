const db = require('./connection');

function values(product) {
  return [product.name, product.description, product.price, product.stock, product.category];
}

module.exports = {
  list() {
    return db.query('SELECT * FROM products ORDER BY id');
  },
  async find(id) {
    const rows = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0];
  },
  async create(product) {
    const rows = await db.query(`
      INSERT INTO products (name, description, price, stock, category)
      VALUES (?, ?, ?, ?, ?) RETURNING *
    `, values(product));
    return rows[0];
  },
  async update(id, product) {
    const rows = await db.query(`
      UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category = ?
      WHERE id = ? RETURNING *
    `, [...values(product), id]);
    return rows[0];
  },
  async remove(id) {
    const rows = await db.query('DELETE FROM products WHERE id = ? RETURNING *', [id]);
    return rows.length > 0;
  },
};
