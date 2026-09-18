(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const panel = $('#admin-panel');
  const form = $('#product-form');
  const list = $('#admin-products');
  const message = $('#admin-message');
  const fields = ['name', 'description', 'price', 'stock', 'category'];
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let authorized = false;
  let editingId = null;
  let generation = 0;
  let busy = false;

  function hide() {
    authorized = false;
    generation++;
    $('#open-admin').hidden = true;
    panel.hidden = true;
    form.hidden = true;
    form.reset();
    list.replaceChildren();
  }

  window.addEventListener('helmet:auth', event => {
    if (event.detail?.role !== 'admin') hide();
    else { authorized = true; $('#open-admin').hidden = false; }
  });

  async function request(url, method = 'GET', data) {
    let response;
    try {
      response = await fetch(url, {
        method, credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Helmet-Request': '1' },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    } catch { throw new Error('Erro de conexão. Tente novamente.'); }
    if (response.status === 401 || response.status === 403) {
      hide();
      $('#account-status').textContent = 'Acesso administrativo indisponível. Confira sua sessão.';
      if (response.status === 401) window.dispatchEvent(new Event('helmet:session-expired'));
    }
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Não foi possível concluir a operação.');
    return body;
  }

  function button(text, action) {
    const node = document.createElement('button');
    node.type = 'button'; node.className = 'button button-outline'; node.textContent = text;
    node.addEventListener('click', action);
    return node;
  }

  function edit(product) {
    if (!authorized || busy) return;
    editingId = product?.id ?? null;
    form.reset();
    fields.forEach(field => { $('#product-' + field).value = product ? product[field] : ''; });
    $('#product-form-title').textContent = product ? 'Editar produto' : 'Novo produto';
    form.hidden = false;
    message.textContent = '';
    $('#product-name').focus();
    form.scrollIntoView({ block: 'nearest' });
  }

  async function load() {
    const current = ++generation;
    const { user } = await request('/api/auth/me');
    if (current !== generation) return;
    if (user.role !== 'admin') { hide(); return; }
    authorized = true;
    const products = await request('/api/products');
    if (!authorized || current !== generation) return;
    list.replaceChildren();
    for (const product of products) {
      const row = document.createElement('article'); row.className = 'admin-row';
      const info = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = product.name;
      const details = document.createElement('p'); details.textContent = `${product.category} · ${money.format(product.price)} · Estoque: ${product.stock}`;
      info.append(title, details);
      const actions = document.createElement('div'); actions.className = 'admin-actions';
      actions.append(button('Editar', () => edit(product)), button('Excluir', () => remove(product)));
      row.append(info, actions); list.append(row);
    }
    if (!products.length) { const empty = document.createElement('p'); empty.textContent = 'Nenhum produto cadastrado.'; list.append(empty); }
  }

  async function change(action, success) {
    if (!authorized || busy) return;
    busy = true;
    panel.setAttribute('aria-busy', 'true');
    panel.querySelectorAll('button').forEach(node => { node.disabled = true; });
    try {
      await action();
      form.hidden = true;
      window.dispatchEvent(new Event('helmet:products-changed'));
      message.textContent = success;
      try { await load(); }
      catch { message.textContent = `${success} Não foi possível atualizar a lista. Use Atualizar lista.`; }
    } catch (error) { message.textContent = error.message; }
    finally {
      busy = false;
      panel.setAttribute('aria-busy', 'false');
      panel.querySelectorAll('button').forEach(node => { node.disabled = false; });
    }
  }

  function remove(product) {
    if (!authorized || busy || !window.confirm(`Excluir o produto “${product.name}”? Esta ação não pode ser desfeita.`)) return;
    change(() => request(`/api/products/${product.id}`, 'DELETE'), 'Produto excluído com sucesso.');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!authorized || busy || !form.reportValidity()) return;
    const data = {};
    fields.forEach(field => { data[field] = $('#product-' + field).value.trim(); });
    if (!data.name || !data.description || !data.category || !data.price || !data.stock) {
      message.textContent = 'Preencha todos os campos.'; return;
    }
    data.price = Number(data.price); data.stock = Number(data.stock);
    if (data.name.length > 120 || data.description.length > 2000 || data.category.length > 80
      || !Number.isFinite(data.price) || data.price <= 0 || !Number.isSafeInteger(data.stock) || data.stock < 0) {
      message.textContent = 'Confira os textos, o preço positivo e o estoque inteiro não negativo.'; return;
    }
    const id = editingId;
    change(() => request(id === null ? '/api/products' : `/api/products/${id}`, id === null ? 'POST' : 'PUT', data),
      id === null ? 'Produto cadastrado com sucesso.' : 'Produto atualizado com sucesso.');
  });

  $('#open-admin').addEventListener('click', async () => {
    if (!authorized) return;
    try {
      await load();
      if (!authorized) return;
      panel.hidden = false;
      message.textContent = '';
      panel.scrollIntoView();
    } catch (error) { $('#account-status').textContent = error.message; }
  });
  $('#new-product').addEventListener('click', () => edit(null));
  $('#cancel-product').addEventListener('click', () => { form.hidden = true; form.reset(); });
  $('#close-admin').addEventListener('click', () => { panel.hidden = true; form.hidden = true; $('#open-admin').focus(); });
  $('#refresh-admin').addEventListener('click', async () => {
    try { await load(); message.textContent = 'Lista atualizada.'; }
    catch (error) { message.textContent = error.message; }
  });
})();
