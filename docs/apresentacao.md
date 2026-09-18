# Apresentação — Helmet Store

Roteiro para aproximadamente **5 minutos**. As perguntas são material de preparação: não precisam ser lidas durante a fala. O cronograma soma 300 segundos, sem contar perguntas do professor.

## Preparação

Deixe abertos o site, o README, a árvore de pastas e o resultado de `npm test`. Tenha contas de demonstração customer e admin preparadas, sem exibir credenciais. Para demonstrar escritas, prefira a execução local com SQLite e dados fictícios; exclua apenas o produto criado para a demonstração. Não mostre variáveis privadas, cookies, arquivos de ambiente ou telas com informações de conexão. Não faça push ou deploy durante a apresentação.

Se usar produção para mostrar a interface, não é necessário alterar seu catálogo. A demonstração do CRUD pode ser feita localmente. Não leia todos os arquivos: mostre o ponto que sustenta cada explicação.

## Roteiro de 5 minutos

### 1. Apresentação do projeto — 0:00–0:20

- **Mostrar:** página inicial e título do README.
- **Falar:** “Sou João Victor e desenvolvi individualmente a Helmet Store, uma loja fictícia de capacetes. O objetivo foi conectar interface, API, banco de dados e segurança em um projeto acadêmico.”
- **Pergunta possível:** É uma loja que vende de verdade?
- **Resposta:** “Não. Os produtos são demonstrativos e não há compras ou pagamentos.”

### 2. Tecnologias — 0:20–0:35

- **Mostrar:** tabela de tecnologias do README.
- **Falar:** “Usei HTML, CSS e JavaScript na interface, Node.js com Express no servidor e bancos relacionais para persistir os dados.”
- **Pergunta possível:** Você usou React?
- **Resposta:** “Não. A interface usa JavaScript puro, Fetch API e manipulação do DOM.”

### 3. Organização das pastas — 0:35–0:50

- **Mostrar:** `frontend`, `backend`, `database`, `tests`, `scripts` e `docs` no editor.
- **Falar:** “Separei a apresentação visual, as regras do servidor, o acesso ao banco, os testes e a documentação. Isso facilita localizar cada responsabilidade.”
- **Pergunta possível:** Qual arquivo inicia o servidor?
- **Resposta:** “Localmente, backend/src/server.js. Na Vercel, api/index.js exporta o mesmo app.”

### 4. Demonstração do frontend — 0:50–1:20

- **Mostrar:** catálogo, um modal de detalhes e a janela em largura menor.
- **Falar:** “Os cards vêm da API, não de quatro produtos escritos manualmente no HTML. Ao abrir os detalhes, faço outra consulta pelo ID. A interface também se adapta a telas menores.”
- **Pergunta possível:** As imagens são fotos dos produtos?
- **Resposta:** “São ilustrações conceituais próprias. Não representam modelos reais.”

### 5. Cadastro/login — 1:20–1:50

- **Mostrar:** formulários de cadastro e login; sessão de demonstração restaurada após recarregar.
- **Falar:** “O cadastro valida os dados e cria uma conta comum. O login verifica a senha e cria uma sessão. Ao recarregar, a página consulta quem está autenticado. Sair revoga a sessão.”
- **Pergunta possível:** O cadastro já faz login?
- **Resposta:** “Não. Depois do cadastro, o usuário entra pelo formulário de login.”

### 6. Diferença customer/admin — 1:50–2:10

- **Mostrar:** cabeçalho de customer e, em sessão separada, botão Admin.
- **Falar:** “Customer consulta o catálogo e acessa a conta. Admin também gerencia produtos. O cadastro não permite escolher admin; a promoção é feita por um script local autorizado.”
- **Pergunta possível:** Basta alterar o botão no navegador para virar admin?
- **Resposta:** “Não. O servidor verifica a sessão e a role atual no banco em cada escrita.”

### 7. CRUD administrativo — 2:10–3:05

- **Mostrar:** criar um produto fictício local, editar seu estoque e excluir com confirmação.
- **Falar:** “CRUD significa criar, consultar, atualizar e excluir. A interface envia as operações para a API e atualiza a lista e o catálogo. A exclusão pede confirmação antes de prosseguir.”
- **Pergunta possível:** O que ocorre se um customer chamar a API diretamente?
- **Resposta:** “Recebe 403. Sem uma sessão válida, recebe 401. As consultas GET permanecem públicas.”

### 8. Banco SQLite x Neon — 3:05–3:25

- **Mostrar:** diagrama de arquitetura e nomes dos adaptadores de banco, sem abrir dados privados.
- **Falar:** “Localmente uso SQLite, um arquivo no computador. Em produção uso PostgreSQL no Neon. A configuração do ambiente seleciona o adaptador e as rotas mantêm a mesma lógica.”
- **Pergunta possível:** O banco local é sincronizado com o de produção?
- **Resposta:** “Não. São bancos separados. O seed inicial insere os quatro produtos apenas quando a tabela está vazia.”

### 9. Backend/API — 3:25–3:45

- **Mostrar:** tabela de endpoints ou resposta de `GET /api/products`, sem cabeçalhos de sessão.
- **Falar:** “A API recebe requisições HTTP, valida os dados, consulta o banco e responde em JSON. Uso GET para consulta, POST para criação, PUT para atualização e DELETE para exclusão.”
- **Pergunta possível:** Para que serve health?
- **Resposta:** “Confirma que a API responde. Não verifica a disponibilidade do banco.”

### 10. Segurança e validações — 3:45–4:10

- **Mostrar:** resumo de segurança do README e um campo inválido no formulário.
- **Falar:** “As senhas recebem hash com scrypt e salt aleatório. A sessão usa cookie HttpOnly. Valido no navegador e no servidor, uso SQL parametrizado e protejo as rotas administrativas. Segredos ficam fora do código.”
- **Pergunta possível:** Por que validar também no backend?
- **Resposta:** “Porque alguém pode chamar a API sem usar o formulário. A validação do navegador pode ser contornada.”

### 11. Testes — 4:10–4:25

- **Mostrar:** resumo de `npm test`: 29 testes aprovados no fechamento.
- **Falar:** “Testei autenticação, permissões, produtos e promoção de usuário em bancos temporários. O caminho Neon também tem testes de transporte simulado, sem usar produção.”
- **Pergunta possível:** Isso garante que nunca haverá erro?
- **Resposta:** “Não. Os testes cobrem cenários definidos. Não são cobertura total nem substituem validação visual e integração real.”

### 12. Git/GitHub — 4:25–4:35

- **Mostrar:** histórico de mensagens de commits ou visão do repositório, sem dados pessoais de contas.
- **Falar:** “Git registra as versões do projeto. GitHub guarda o repositório remoto, permitindo acompanhar sua evolução.”
- **Pergunta possível:** Commit e push são iguais?
- **Resposta:** “Commit registra localmente; push envia os commits ao remoto.”

### 13. Vercel — 4:35–4:50

- **Mostrar:** aplicação publicada ou status do deployment, sem abrir variáveis privadas.
- **Falar:** “A Vercel hospeda a interface e executa a API. Com a integração GitHub ativa e main como branch de produção, um novo push inicia um deployment.”
- **Pergunta possível:** O banco fica dentro da Vercel?
- **Resposta:** “O PostgreSQL fica no Neon. A função na Vercel se conecta a ele por configuração privada do ambiente.”

### 14. Encerramento — 4:50–5:00

- **Mostrar:** página inicial.
- **Falar:** “O projeto integrou interface, servidor, persistência e controle de acesso. O principal aprendizado foi construir e validar o fluxo completo, do navegador ao banco.”
- **Pergunta possível:** Qual é o limite desta entrega?
- **Resposta:** “É uma demonstração acadêmica de catálogo e administração, sem carrinho funcional, pedidos ou pagamentos.”

## Conceitos que preciso saber explicar

| Conceito | Explicação simples e relação com o projeto |
| --- | --- |
| Frontend | Parte exibida no navegador: página, estilos, formulários e interações. |
| Backend | Parte executada no servidor: valida dados, aplica permissões e acessa o banco. |
| API | Interface de comunicação entre programas. Aqui, o frontend envia HTTP e recebe JSON do Express. |
| Rota/endpoint | Endereço e método que identificam uma operação, como GET /api/products. |
| Banco de dados | Armazena informações organizadas, como produtos, usuários e sessões. |
| CRUD | Create, Read, Update e Delete: criar, consultar, atualizar e excluir registros. |
| Autenticação | Verifica quem é o usuário, por exemplo comparando a senha no login. |
| Autorização | Decide o que o usuário pode fazer. Estar logado como customer não permite editar produtos. |
| Hash | Resultado de uma transformação de mão única. No login, derivamos novamente e comparamos; não recuperamos a senha original. O salt aleatório diferencia hashes mesmo para senhas iguais. |
| Sessão | Registro que permite reconhecer uma conta após o login. Aqui fica no banco, expira e pode ser revogado. |
| Cookie HttpOnly | Dado enviado pelo navegador ao servidor, indisponível para leitura pelo JavaScript da página. Não elimina sozinho todos os riscos de segurança. |
| Variável de ambiente | Configuração fornecida ao processo sem escrever seu valor no código. Pode conter informação privada e não deve ser exibida. |
| Git | Ferramenta de controle de versões que mantém o histórico local do projeto. |
| GitHub | Serviço que hospeda repositórios Git na internet; não é o mesmo que Git. |
| Commit | Registro local de um conjunto de alterações com uma mensagem descritiva. |
| Push | Envio de commits locais para um repositório remoto. |
| Deploy | Processo de disponibilizar uma versão da aplicação no ambiente de hospedagem. |
| SQLite | Banco relacional embutido que grava em arquivo; simplifica o desenvolvimento local. |
| PostgreSQL | Sistema de banco relacional executado como serviço, usado para a persistência em produção. |
| Neon | Serviço que hospeda o PostgreSQL utilizado pela aplicação. |
| Vercel | Plataforma que publica os arquivos do frontend e executa a função Node da API. |

## Pontos para não confundir durante a fala

- Esconder o botão Admin não substitui a autorização no servidor.
- Não há JWT: o projeto usa sessões opacas persistidas no banco.
- Customer não realiza compras nesta versão; o carrinho é somente visual.
- O build gera arquivos de publicação, mas não roda `npm test` automaticamente.
- Os testes simulados do driver Neon não executam SQL em um PostgreSQL real.
- Commit não publica o site por si só; o fluxo de push e integração dispara o deployment.
- Um teste aprovado não comprova ausência de todas as falhas de segurança.
