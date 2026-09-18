(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const dialog = $('#auth-dialog');
  const form = $('#auth-form');
  const message = $('#auth-message');
  let register = false;
  let revision = 0;

  function setUser(user) {
    $('#open-auth').hidden = Boolean(user);
    $('#account-name').hidden = !user;
    $('#account-name').textContent = user ? user.name : '';
    $('#logout').hidden = !user;
    window.dispatchEvent(new CustomEvent('helmet:auth', { detail: user }));
  }

  function mode(isRegister) {
    register = isRegister;
    $('#name-field').hidden = !register;
    $('#auth-name').disabled = !register;
    $('#auth-name').required = register;
    $('#auth-password').value = '';
    $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
    $('#auth-title').textContent = register ? 'Seu caminho começa aqui.' : 'Bem-vindo de volta.';
    $('#auth-submit').textContent = register ? 'Cadastrar' : 'Entrar';
    $('#switch-auth').textContent = register ? 'Já tem conta? Entre' : 'Ainda não tem conta? Cadastre-se';
    message.textContent = register ? 'Crie sua conta na Helmet Store.' : 'Entre para acessar sua conta.';
  }

  async function request(route, body) {
    let response;
    try {
      response = await fetch(`/api/auth/${route}`, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Helmet-Request': '1' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new Error('Erro de conexão. Verifique sua internet e tente novamente.'); }
    let data;
    try { data = await response.json(); }
    catch { throw new Error('Não foi possível acessar sua conta. Tente novamente.'); }
    if (!response.ok) {
      const error = new Error(data.message || 'Não foi possível concluir a operação.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  $('#open-auth').addEventListener('click', () => { mode(false); dialog.showModal(); $('#auth-email').focus(); });
  $('#close-auth').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { $('#auth-password').value = ''; });
  $('#switch-auth').addEventListener('click', () => { mode(!register); (register ? $('#auth-name') : $('#auth-email')).focus(); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('#auth-name').value.trim();
    const email = $('#auth-email').value.trim().toLowerCase();
    const password = $('#auth-password').value;
    $('#auth-email').value = email;
    $('#auth-name').value = name;
    if (!form.reportValidity() || (register && (name.length < 2 || name.length > 60))
      || email.length > 120 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)
      || password.length < 8 || password.length > 72) {
      message.textContent = 'Confira os dados: nome de 2 a 60 caracteres, e-mail válido e senha de 8 a 72 caracteres.';
      return;
    }
    revision++;
    const submittedRegister = register;
    $('#auth-submit').disabled = true;
    $('#switch-auth').disabled = true;
    message.textContent = register ? 'Cadastrando…' : 'Entrando…';
    try {
      const data = await request(submittedRegister ? 'register' : 'login', { name, email, password });
      if (submittedRegister) {
        mode(false);
        message.textContent = 'Cadastro concluído! Entre com seu e-mail e senha.';
        $('#auth-password').focus();
      } else {
        setUser(data.user);
        $('#account-status').textContent = 'Login concluído. Bem-vindo à Helmet Store!';
        dialog.close();
      }
    } catch (error) { message.textContent = error.message; }
    finally { $('#auth-password').value = ''; $('#auth-submit').disabled = false; $('#switch-auth').disabled = false; }
  });

  $('#logout').addEventListener('click', async () => {
    revision++;
    $('#logout').disabled = true;
    try {
      await request('logout', {});
      setUser(null);
      $('#account-status').textContent = 'Você saiu da sua conta.';
    } catch (error) { $('#account-status').textContent = error.message; }
    finally { $('#logout').disabled = false; }
  });

  const initialRevision = revision;
  window.addEventListener('helmet:session-expired', () => { revision++; setUser(null); });
  request('me').then(data => { if (revision === initialRevision) setUser(data.user); })
    .catch(error => {
      if (revision === initialRevision && error.status !== 401) $('#account-status').textContent = error.message;
    });
})();
