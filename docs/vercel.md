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

## SQLite nesta etapa

O arquivo local `database/helmet-store.db` e seus dados permanecem intactos.
Ele continua ignorado pelo Git e não é enviado como parte do catálogo remoto.

Com `VERCEL=1`, a conexão usa o diretório temporário do sistema (`/tmp` na
Vercel), pois o restante do filesystem da função é somente leitura. Cada nova
instância sem banco recebe os quatro produtos fictícios já definidos no projeto.
O CRUD funciona nessa instância, mas alterações podem desaparecer quando ela for
substituída e não são compartilhadas entre instâncias. Isso permite demonstrar a
aplicação, mas não oferece persistência de uma loja em produção. Uma etapa futura
deverá adotar armazenamento persistente externo.

Nenhum deploy é realizado pelos scripts deste projeto.

Referências:
- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/runtimes#file-system-support
