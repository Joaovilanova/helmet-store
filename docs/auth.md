# Contas e autenticação

Execute `npm start` com Node 22. Abra a página e escolha Entrar / Cadastre-se.
O cadastro não inicia sessão automaticamente: após a confirmação, faça login.
`npm test` executa os testes isolados de autenticação e produtos/banco.
`npm run vercel-build` gera o frontend em `public/`.

## Banco e variáveis

`DATABASE_URL` seleciona PostgreSQL/Neon. Sem ela, o SQLite local é mantido.
`PORT` configura a porta local. `NODE_ENV=production` ativa cookies Secure;
na Vercel isso também ocorre automaticamente por `VERCEL=1`.
Não é necessário AUTH_SECRET: as sessões são opacas, aleatórias e verificadas no
banco, sem JWT ou assinatura compartilhada. Nunca inclua segredos reais no Git,
em exemplos, no frontend ou em logs. `.env.example` é apenas documentação; os
arquivos `.env` não são carregados automaticamente por `npm start`.

As tabelas são criadas com `CREATE TABLE IF NOT EXISTS`, sem apagar dados:
- `users`: id autogerado, name, email único normalizado, password_hash, role
  (customer/admin, padrão customer), created_at em UTC/ISO 8601.
- `sessions`: token_hash (chave primária), user_id (FK), expires_at em milissegundos.
- `auth_limits`: key (hash de ação/e-mail), hits, expires_at.

O PostgreSQL usa BIGINT para IDs e timestamps de expiração; SQLite usa INTEGER
autoincremental para users.id. As demais colunas de users são TEXT NOT NULL.
Nenhum administrador é criado, e role enviada pelo cliente é ignorada.

## API

- POST /api/auth/register: name (2–60 após trim), email (válido, até 120),
  password (8–72). Retorna 201, 400 para dados inválidos e 409 para email duplicado.
- POST /api/auth/login: email e password; 200 e cookie em sucesso, 401 com mensagem
  única para credenciais incorretas, 400 para formato inválido.
- GET /api/auth/me: 200 com user contendo apenas id, name, email e role; 401 sem sessão.
- POST /api/auth/logout: revoga a sessão no banco e expira o cookie (200).

POSTs exigem JSON e o cabeçalho `X-Helmet-Request: 1`. O frontend envia ambos.
Não habilitar CORS indiscriminadamente: esse cabeçalho, a rejeição de
Sec-Fetch-Site cross-site e SameSite=Lax compõem a proteção CSRF.
Todas as respostas de autenticação usam Cache-Control: no-store.

Senhas não são aparadas nem truncadas. São derivadas com scrypt assíncrono do
Node: N=131072, r=8, p=1, salt aleatório de 16 bytes e hash de 64 bytes. Não há
dependências adicionais ou módulos nativos npm. A comparação usa timingSafeEqual;
usuários inexistentes também executam scrypt. Os limites de tamanho seguem a
contagem UTF-16 do JavaScript/HTML, sem limitação em bytes do bcrypt.

Sessões usam tokens aleatórios de 32 bytes e duram sete dias. Só o SHA-256 do
token fica no banco. O token bruto trafega somente em Set-Cookie/Cookie, nunca
no JSON ou localStorage. Cookie HttpOnly, SameSite=Lax, Path=/, Secure em produção
e prefixo __Host- em produção. Login rotaciona a sessão apresentada; logout a
revoga imediatamente. Sessões expiradas são ignoradas e limpas no próximo login.
O limite é 20 tentativas por ação/email em 15 minutos, compartilhado no banco.
Isso é uma proteção básica por conta, não substitui controles de tráfego globais.

## Escopo e publicação

O catálogo (GET) permanece público. POST, PUT e DELETE de produtos exigem sessão
válida e role admin consultada no banco a cada requisição (401 sem sessão, 403
para customer). As escritas também exigem X-Helmet-Request: 1; POST/PUT exigem JSON.
Veja [admin.md](admin.md) para a interface e a promoção segura de uma conta existente.
Não há verificação de email ou recuperação de senha nesta versão.

Na Vercel, mantenha DATABASE_URL no ambiente publicado. Não é preciso um novo
segredo de autenticação ou mudança de roteamento. O usuário PostgreSQL precisa
de permissão para criar as novas tabelas e índices. Os testes PostgreSQL locais
usam HTTP simulado; a integração com Neon real requer validação em publicação
posterior autorizada. Use HTTPS em produção. Nenhum deploy é feito pelos testes.

Referências: https://nodejs.org/api/crypto.html e
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
