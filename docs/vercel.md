# Execução na Vercel

Use a raiz do repositório como Root Directory (não `frontend/` ou `backend/`).
O `vercel.json` define `framework: null` (preset Other), o comando de build e a
saída `public`. Esses valores substituem os respectivos ajustes do painel.
O Root Directory ainda precisa apontar para a raiz, onde está o `vercel.json`.

A abordagem é uma função Node em `api/index.js`, que exporta o app Express
existente sem abrir porta, e arquivos estáticos publicados pela CDN. Não há
entry point Express na raiz nem configuração legada `builds`/`routes`.

O rewrite `/api/:path*` direciona todas as chamadas da API para `/api/index`,
mantendo o caminho original recebido pelo Express e os métodos HTTP. Assim,
GET, POST, PUT e DELETE continuam usando as mesmas rotas do backend.
`/`, `/css/styles.css` e `/js/app.js` são servidos a partir de `public/`, sem
passar pela função ou depender de `express.static()` na Vercel.

O projeto declara Node 22.x. O script `npm run vercel-build` copia o frontend de
`frontend/src/` para `public/`, pasta publicada pela CDN da Vercel. Essa saída é
gerada e ignorada pelo Git; edite somente os arquivos em `frontend/src/`.
O build verifica a presença dos três arquivos essenciais antes de concluir.

## Diagnóstico do deployment anterior

O `server.js` anterior era um formato aceito pela documentação atual; TypeScript
não é obrigatório. Porém, a publicação dependia da detecção do preset e do
diretório de saída no painel, sem configuração explícita no repositório.
Um status Ready não confirma que `/` foi associado a um arquivo ou função.

A URL informada respondeu externamente com HTTP 302 para o login da Vercel,
impedindo a reprodução do 404 sem acesso autenticado. Sem Build Logs e ajustes
do deployment, não foi possível confirmar se a causa específica foi preset,
Root Directory, saída ou uma revisão diferente do código. A configuração atual
torna explícitos o build, a saída estática e o roteamento da API.

Depois de publicar esta revisão, confira nos resultados do build a função
`api/index` e os arquivos `index.html`, `css/styles.css` e `js/app.js`.
Valide `/`, `/css/styles.css`, `/js/app.js`, `/api/health`, `/api/products`
e `/api/products/1`. Um deployment já existente não muda com alterações locais;
é necessário criar um novo deployment da revisão corrigida.

Localmente, `npm start` continua executando `backend/src/server.js`, na porta
`PORT` ou 3000, e servindo o frontend com Express. Todas as rotas de produtos e
`GET /api/health` continuam disponíveis.

## PostgreSQL/Neon e SQLite

Quando `DATABASE_URL` está definida, o backend usa `@neondatabase/serverless`
por HTTP. A variável é lida somente no servidor. Não há fallback para SQLite
se a conexão PostgreSQL falhar: a API responde 500 com mensagem genérica.

Na primeira operação de produtos de cada instância, uma transação cria a tabela
PostgreSQL com `CREATE TABLE IF NOT EXISTS` e insere o seed somente se a tabela
estiver vazia. Um advisory lock transacional serializa inicializações
concorrentes; o isolamento Read Committed permite que a instância seguinte veja
o seed já confirmado. A promessa de inicialização é compartilhada na instância
e descartada em caso de erro para permitir nova tentativa.

Os quatro produtos são definidos uma única vez em `backend/src/database/seed.js`.
Os dados atuais do SQLite não são transferidos automaticamente para o Neon.
Consultas de produtos usam parâmetros separados do SQL nos dois bancos.

Sem `DATABASE_URL`, o desenvolvimento usa o SQLite original. `.env.example`
documenta variáveis seguras; `npm start` não carrega arquivos `.env` sozinho.

O arquivo local `database/helmet-store.db` e seus dados permanecem intactos.
Ele continua ignorado pelo Git e não é enviado como parte do catálogo remoto.

Sem `DATABASE_URL` e com `VERCEL=1`, a conexão usa o diretório temporário do sistema (`/tmp` na
Vercel), pois o restante do filesystem da função é somente leitura. Cada nova
instância sem banco recebe os quatro produtos fictícios já definidos no projeto.
O CRUD funciona nessa instância, mas alterações podem desaparecer quando ela for
substituída e não são compartilhadas entre instâncias. Isso permite demonstrar a
aplicação, mas não oferece persistência de uma loja em produção. Com a variável
Neon configurada, esse fallback temporário não é usado.

## Validação e próxima publicação

Execute `node --test tests/database.test.js` para testar o CRUD em SQLite
temporário e o driver Neon com transporte HTTP simulado (sem credencial ou rede).
O teste de transporte não substitui um teste de integração com PostgreSQL real.

A integração Neon já fornece `DATABASE_URL`; ela deve estar disponível no
ambiente da próxima publicação (Production e/ou Preview). O usuário do banco
precisa ter permissão para criar a tabela e executar o CRUD. Nenhuma configuração
de roteamento precisa mudar. Após uma publicação futura autorizada, a primeira
consulta de produtos inicializará o PostgreSQL. Health indica funcionamento da
API, não testa a disponibilidade do banco.

Nenhum deploy é realizado pelos scripts deste projeto.

Cadastro, login e sessões persistentes estão documentados em [auth.md](auth.md).

Referências:
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/runtimes#file-system-support
