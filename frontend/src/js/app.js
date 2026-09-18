'use strict';

const grid = document.querySelector('#product-grid');
const status = document.querySelector('#catalog-status');
const retry = document.querySelector('#retry-products');
const dialog = document.querySelector('#product-dialog');
const detailTitle = document.querySelector('#detail-title');
const detailStatus = document.querySelector('#detail-status');
const detailContent = document.querySelector('#detail-content');
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let detailController;

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function helmetVisual() {
  const visual = element('div', 'product-visual');
  visual.setAttribute('aria-hidden', 'true');
  visual.append(element('span', 'visual-label', 'HS / CONCEPT'), document.querySelector('#helmet-art').content.cloneNode(true));
  return visual;
}

function productInfo(product) {
  return [
    element('p', 'category', product.category),
    element('p', 'description', product.description),
    element('p', 'price', currency.format(product.price)),
    element('p', 'stock', product.stock > 0 ? `${product.stock} unidade(s) em estoque` : 'Sem estoque no momento'),
  ];
}

async function requestProductData(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function openDetails(id) {
  detailController?.abort();
  const controller = new AbortController();
  detailController = controller;
  detailTitle.textContent = 'Detalhes do capacete';
  detailContent.replaceChildren();
  detailStatus.textContent = 'Carregando detalhes…';
  dialog.showModal();
  try {
    const product = await requestProductData(`/api/products/${encodeURIComponent(id)}`, controller.signal);
    if (controller.signal.aborted) return;
    detailTitle.textContent = product.name;
    detailContent.append(helmetVisual(), ...productInfo(product), element('p', 'catalog-note', 'Produto fictício para demonstração acadêmica. Ilustração conceitual.'));
    detailStatus.textContent = '';
  } catch (error) {
    if (error.name !== 'AbortError') detailStatus.textContent = 'Não foi possível carregar este capacete. Feche os detalhes e tente novamente.';
  }
}

async function loadProducts() {
  status.textContent = 'Carregando capacetes…';
  retry.hidden = true;
  grid.setAttribute('aria-busy', 'true');
  grid.replaceChildren();
  try {
    const products = await requestProductData('/api/products');
    if (!Array.isArray(products)) throw new Error('Resposta inválida');
    const cards = products.map(product => {
      const card = element('article', 'product-card');
      const info = element('div', 'product-info');
      const [category, description, price, stock] = productInfo(product);
      const button = element('button', 'button button-outline', 'Ver detalhes ↗');
      button.type = 'button';
      button.setAttribute('aria-label', `Ver detalhes de ${product.name}`);
      button.addEventListener('click', () => openDetails(product.id));
      info.append(category, element('h3', '', product.name), description, price, stock, button);
      card.append(helmetVisual(), info);
      return card;
    });
    grid.append(...cards);
    status.textContent = products.length ? '' : 'Nenhum capacete disponível no momento. Volte em breve!';
  } catch {
    status.textContent = 'Não foi possível carregar os capacetes. Verifique sua conexão e tente novamente.';
    retry.hidden = false;
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

document.querySelector('.hero-helmet').append(document.querySelector('#helmet-art').content.cloneNode(true));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => detailController?.abort());
retry.addEventListener('click', loadProducts);
loadProducts();
