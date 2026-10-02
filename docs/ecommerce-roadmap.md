# Evolução da Helmet Store

A loja nasceu como projeto acadêmico e evolui por fases. O catálogo atual ainda
contém dados demonstrativos. Não há vendas, checkout ou pagamento nesta versão.

| Fase | Escopo e condições |
| --- | --- |
| 1 — Segurança e interface | Auditar scrypt/salt, sessão e roles; testar campos permitidos e isolamento de conta; disponibilizar mascaramento de e-mail; busca no catálogo e Minha Conta. |
| 2 — Carrinho persistente | Modelar itens por usuário e validar propriedade no backend. Quantidades devem ser inteiras e compatíveis com disponibilidade; preços serão sempre consultados no servidor. |
| 3 — Pedidos e itens | Registrar pedido e itens com valores históricos; usar transações e transições de estado explícitas. Customer acessará somente seus pedidos. Planejar valores monetários exatos antes de vendas. |
| 4 — Endereços e checkout | Coletar apenas dados necessários, proteger acesso e definir retenção. Validar totais e disponibilidade novamente no servidor. Não usar checkout fictício como compra concluída. |
| 5 — Administração de pedidos e estoque | Autorizar cada operação no backend, definir transições permitidas e tratar concorrência/reserva de estoque sem venda acima da disponibilidade. Exibir dados pessoais somente quando necessários. |
| 6 — Provedor de pagamento | Selecionar provedor e integrar fluxo hospedado/tokenizado. Verificar autenticidade e idempotência de notificações; confirmar pagamento no servidor. |

As fases 2–6 são planejamento, não funcionalidades existentes. Helmet Store não
armazenará números completos de cartão ou CVV. Tokens privados e credenciais do
provedor nunca deverão ir ao frontend, Git ou logs.

## Antes de habilitar vendas reais

Validar catálogo e informações reais de produtos, valores monetários, operação de
estoque, infraestrutura, backups/restauração e privacidade. Verificar as garantias
de criptografia em repouso do ambiente contratado e separar permissões de
migração das permissões de execução. A fase 1 não certifica prontidão comercial.

## Armazenamento e exposição

- SQLite local usa `database/helmet-store.db`; o arquivo não é criptografado pela
  aplicação. Proteção de disco, acesso ao sistema e backups são responsabilidades
  do ambiente local. Ignorar o arquivo no Git não o criptografa.
- Produção seleciona PostgreSQL/Neon quando `DATABASE_URL` existe. A aplicação usa
  a variável do servidor, nunca uma conexão embutida no frontend.
- Não há criptografia caseira do banco. Criptografia em repouso, escopo de backups
  e gestão de chaves precisam ser confirmados na documentação e no ambiente do
  provedor efetivamente utilizado. Esta revisão local não verificou o painel Neon
  nem atesta essas garantias para a conta de produção.
- Hash de senha é derivação unidirecional, não criptografia reversível do banco.
  Mascarar e-mail apenas reduz exposição na apresentação; não anonimiza o registro.
- `backend/src/utils/mask-email.js` mantém o domínio e oculta parte do nome local,
  inclusive para nomes curtos. Entradas inválidas retornam `***`. Use apenas quando
  um contexto administrativo realmente precisar mostrar e-mail parcial; omitir
  dados dos logs continua sendo preferível. A conta do próprio usuário mostra o
  e-mail integral, sem alterar o banco ou o login.
- A role da aplicação não equivale à role PostgreSQL. Hoje a conexão inicializa
  tabelas e seeds e, portanto, requer permissões de DDL. Separar migrações e usar
  uma conexão de execução com permissões menores é trabalho futuro, não realizado
  nesta fase. Não conceder acesso ao banco a customers.
