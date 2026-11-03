# Login com Google: como criar o cliente OAuth

Passo a passo para o dono do projeto. Leva uns 15 minutos. Ninguém de fora precisa fazer isso: o login só funciona depois que o cliente existe e as variáveis estão no servidor.

## 1. Projeto no Google Cloud

1. Entre em https://console.cloud.google.com com a conta Google que vai ser "dona" do login (de preferência a conta do projeto, não a pessoal).
2. No seletor de projetos (topo da página), clique em **Novo projeto**, dê o nome `Imperatle` e crie.
3. Confira que o projeto `Imperatle` está selecionado no topo antes de seguir.

## 2. Tela de consentimento (o que o jogador vê ao entrar)

1. Menu lateral: **APIs e serviços > Tela de consentimento OAuth** (em contas novas aparece como **Google Auth Platform**). Clique em **Começar**.
2. **Informações do app**: nome `Imperatle`, e-mail de suporte (o seu).
3. **Público**: escolha **Externo**.
4. **Contato**: o seu e-mail. Aceite a política e crie.
5. Em **Branding** (ou "Informações da marca"), preencha:
   - Página inicial: `https://imperatle.com`
   - Política de privacidade: `https://imperatle.com/pt/privacy`
   - Termos de uso: `https://imperatle.com/pt/terms`
   - Domínios autorizados: `imperatle.com`
   - Logo: opcional. Se colocar, o Google pede verificação da marca, que pode levar alguns dias. Sem logo, não precisa.
6. Em **Acesso a dados** (escopos), não precisa adicionar nada: o login usa só `openid`, `email` e `profile`, que são básicos e não pedem verificação.
7. Em **Público**, clique em **Publicar app** para passar de "Teste" para "Em produção". Enquanto estiver em "Teste", só os e-mails que você listar como usuários de teste conseguem entrar (bom para testar antes do lançamento).

## 3. Cliente OAuth (o id e o segredo)

1. Vá em **Clientes** (ou **APIs e serviços > Credenciais > Criar credenciais > ID do cliente OAuth**).
2. Tipo de aplicativo: **Aplicativo da Web**. Nome: `Imperatle API`.
3. **Origens JavaScript autorizadas**: pode deixar vazio (o login é feito pelo servidor).
4. **URIs de redirecionamento autorizados**, adicione exatamente:
   - `https://api.imperatle.com/signin-google` (produção)
   - `http://localhost:5055/signin-google` (para testar no seu computador)
5. Clique em **Criar**. Aparece o **ID do cliente** e a **Chave secreta do cliente**. Copie os dois agora e guarde num lugar seguro (gerenciador de senhas). O segredo não deve ir para o GitHub nem para nenhum arquivo do repositório.

Se o endereço da API for outro, o URI muda junto: é sempre `https://<endereço da API>/signin-google`. Um URI diferente do cadastrado dá o erro `redirect_uri_mismatch` na tela do Google.

## 4. Colocar as chaves no servidor (Azure Container Apps)

No portal do Azure, no Container App da API, em **Segredos** e depois **Contêineres > Variáveis de ambiente** (ou pela linha de comando), crie:

| Variável | Valor |
|---|---|
| `Auth__Google__ClientId` | o ID do cliente |
| `Auth__Google__ClientSecret` | a chave secreta (guarde como segredo e referencie na variável) |
| `Auth__CookieDomain` | `imperatle.com` |

Confira também que `Cors__AllowedOrigins` tem os endereços do site (`https://imperatle.com,https://www.imperatle.com`): é para lá que o login pode voltar.

Salve, espere a nova revisão subir e teste: menu > **Entrar** > **Entrar com Google**.

## 5. Testar no seu computador

Antes de rodar `dotnet run` em `apps/api`, defina as variáveis no terminal (PowerShell):

```powershell
$env:Auth__Google__ClientId = "<id do cliente>"
$env:Auth__Google__ClientSecret = "<chave secreta>"
dotnet run
```

Deixe `Auth__CookieDomain` vazio localmente. O site (`npm run dev`) precisa de `NEXT_PUBLIC_API_URL=http://localhost:5055` no `apps/web/.env.local`.

## Se algo der errado

- **`redirect_uri_mismatch`**: o URI cadastrado no passo 3 não bate letra por letra com o endereço da API (http x https, porta, barra no fim).
- **Volta para o site com "Não deu pra entrar com o Google"**: as variáveis do passo 4 estão vazias ou erradas, ou o login foi cancelado na tela do Google.
- **"Este app não foi verificado" / "acesso bloqueado"**: o app ainda está em "Teste" e o seu e-mail não está na lista de usuários de teste. Publique o app (passo 2.7) ou adicione o e-mail.
- **Entra mas o site continua mostrando "Entrar"**: o site precisa estar aberto em `imperatle.com` e a API em `api.imperatle.com` (mesmo domínio). Num endereço `.vercel.app` o navegador trata o cookie de login como de terceiros e pode bloquear. Confira também `Auth__CookieDomain=imperatle.com`.
