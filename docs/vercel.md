# Execução na Vercel

Use a raiz do repositório como Root Directory e o preset Express, detectado pelo
`server.js`. O entry point exporta a aplicação sem abrir uma porta. Não é
necessário criar `vercel.json`, rewrites ou configurações legadas de builds.

O projeto declara Node 22.x. O script `npm run vercel-build` copia o frontend de
`frontend/src/` para `public/`, pasta publicada pela CDN da Vercel. Essa saída é
gerada e ignorada pelo Git; edite somente os arquivos em `frontend/src/`.

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
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/runtimes#file-system-support
