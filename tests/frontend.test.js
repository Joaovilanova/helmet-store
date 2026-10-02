const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('catálogo busca sem acentos, mantém dados como texto e atualiza após CRUD', async () => {
  // DOM mínimo para exercitar o script real sem instalar biblioteca de navegador.
  class Node {
    constructor() { this.children = []; this.events = {}; this.value = ''; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {}
    addEventListener(name, action) { this.events[name] = action; }
    scrollIntoView() {}
  }
  const nodes = new Map();
  const find = selector => {
    if (!nodes.has(selector)) nodes.set(selector, new Node());
    return nodes.get(selector);
  };
  find('#helmet-art').content = { cloneNode: () => new Node() };
  const events = {};
  let products = [{ id: 1, name: '<img src=x onerror=alert(1)>', description: 'Capacete urbano', category: 'Proteção', price: 10, stock: 2 }];
  let fail = false;
  const context = vm.createContext({
    document: { querySelector: find, createElement: () => new Node() },
    window: { addEventListener: (name, action) => { events[name] = action; } },
    Intl, AbortController,
    fetch: async () => {
      if (fail) throw new Error('offline');
      return { ok: true, json: async () => products };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/src/js/app.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  const grid = find('#product-grid');
  assert.equal(grid.children.length, 1);
  assert.equal(grid.children[0].children[1].children[1].textContent, products[0].name);
  find('#search-products').value = 'protecao';
  find('#search-products').events.input();
  assert.equal(grid.children.length, 1);
  find('#search-products').value = 'inexistente';
  find('#search-products').events.input();
  assert.equal(grid.children.length, 0);
  assert.match(find('#catalog-status').textContent, /Nenhum capacete encontrado/);
  find('#search-products').value = '';
  products = [...products, { ...products[0], id: 2, name: 'Outro modelo' }];
  await events['helmet:products-changed']();
  assert.equal(grid.children.length, 2);
  fail = true;
  await events['helmet:products-changed']();
  assert.equal(find('#retry-products').hidden, false);
  assert.match(find('#catalog-status').textContent, /Verifique sua conexão/);
});
