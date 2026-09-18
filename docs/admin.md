# Administração de produtos

Customer pode consultar produtos e acessar sua conta. Admin também pode cadastrar,
editar e excluir produtos. O cadastro continua criando somente customer e não
aceita escolha de role. Não há administrador ou credencial predefinidos.

O backend usa os middlewares identifyUser, requireAuthentication e requireAdmin.
A sessão existente identifica o usuário; a role atual vem do banco, nunca do
corpo ou dos cabeçalhos enviados pelo cliente. GETs são públicos. As escritas
retornam 401 sem sessão e 403 para customer. A proteção CSRF exige
X-Helmet-Request: 1, rejeita Sec-Fetch-Site cross-site e exige JSON em POST/PUT.

## Promoção local

Na raiz do projeto, com Node 22 e dependências já instaladas:

```powershell
node scripts/promote-admin.js usuario@exemplo.com
# Alternativa:
npm run promote-admin -- usuario@exemplo.com
```

O endereço acima é apenas ilustrativo; use o e-mail da conta já cadastrada.
O script normaliza o endereço (trim + minúsculas) e executa um UPDATE parametrizado
alterando somente role. RETURNING confirma se a conta existe. Se não existir,
termina com erro sem criar usuário. É seguro repetir a promoção. Não imprime
e-mail, ID, credenciais, SQL ou mensagens internas do driver. Não executa migrations
ou seeds. Sem DATABASE_URL, usa o SQLite local já existente; não cria arquivo novo.

## Promover sua conta do Neon sem salvar a conexão

1. No painel do Neon, selecione o mesmo projeto, branch e banco usados pela
   integração da Vercel em produção. Tenha acesso privado à connection string.
   Não envie essa informação ao assistente, nem a coloque em arquivos do projeto.
2. Abra PowerShell na raiz do projeto. Se DATABASE_URL já estiver configurada
   nesse terminal para esse banco, execute diretamente o script. Caso contrário,
   execute o bloco abaixo: a conexão será solicitada com entrada oculta, mantida
   apenas no ambiente do processo e removida ao final. Ela não entra no histórico
   como parte do comando.

```powershell
$neonSecret = Read-Host 'Conexão Neon (entrada oculta)' -AsSecureString
$neonPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($neonSecret)
try {
    $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($neonPointer)
    if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) { throw 'Conexão não informada.' }
    $adminEmail = Read-Host 'E-mail da conta já cadastrada'
    node scripts/promote-admin.js $adminEmail
} finally {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($neonPointer)
    $neonSecret.Dispose()
}
```

3. Confira a mensagem de sucesso. Se não encontrar o usuário, confira o e-mail
   e o banco selecionados. Não crie uma conta paralela ou um admin com senha fixa.
4. Na aplicação com esta versão administrativa publicada, recarregue a página.
   A sessão existente lê a role atual em /api/auth/me; se estiver expirada, entre
   novamente. O botão Admin aparecerá. Promover a conta não publica os arquivos
   locais: a interface requer uma publicação futura autorizada desta versão.

Nunca commite DATABASE_URL, senhas ou outras credenciais. Nenhum comando desta
documentação faz commit, push ou deploy. Nenhuma promoção em Neon é executada
automaticamente pelos testes.

## Interface e validações

Admin abre uma área na própria página, com lista, Novo produto, Editar, Excluir
e confirmação de exclusão. A cada alteração, lista e catálogo são atualizados.
Customer e visitantes não recebem controles visíveis; a API impõe a autorização
independentemente da interface. Sessão expirada ou role revogada oculta o painel.

O formulário exige todos os campos, textos não vazios após trim, nome até 120,
descrição até 2000 e categoria até 80 caracteres, preço a partir de 0,01 (passo
0,01) e estoque inteiro seguro não negativo. Os limites de texto também são
validados no backend, junto às regras de strings não vazias,
preço finito positivo, estoque inteiro seguro não negativo e ID inteiro positivo.
Dados dinâmicos usam textContent. Todos os erros são exibidos como texto.

`npm test` inclui testes de autorização, promoção isolada, autenticação e produtos.
`npm run vercel-build` gera os assets. `npm start` mantém a execução local.
