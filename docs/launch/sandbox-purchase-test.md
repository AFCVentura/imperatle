# Teste de compra no sandbox da Paddle (no seu PC)

Roteiro para testar o Apoio de ponta a ponta com dinheiro de mentira: entrar com Google, comprar com o cartão de teste, ver o Apoio ligar, reembolsar e ver o Apoio sumir. Tudo roda no seu computador; a Paddle sandbox alcança a API local por um túnel do Cloudflare.

Como funciona:

```
navegador (localhost:3000) --checkout--> Paddle sandbox
Paddle sandbox --webhook--> https://<algo>.trycloudflare.com/webhooks/paddle --túnel--> API (localhost:5055) --> Postgres (imperatle_sandbox)
```

O que o script `scripts/sandbox-test.ps1` faz por você:

- confere se Docker, .NET, Node e cloudflared estão instalados e se as portas 5055 e 3000 estão livres;
- lê os segredos de `C:\secrets\imperatle\` sem mostrar os valores e **recusa rodar** se algum valor parecer da conta live;
- sobe o Postgres (`docker compose`) e cria um banco separado, `imperatle_sandbox` (o `imperatle_dev` não é tocado);
- abre a API e o site em duas janelas novas do PowerShell, já com as variáveis do sandbox;
- abre o túnel e mostra a URL para colar na Paddle.

Nada disso mexe em produção nem no `.env.local` do site: as variáveis valem só para as janelas abertas pelo script.

---

## 1. Preparar (uma vez só)

### 1.1 Instalar o cloudflared

```powershell
winget install --id Cloudflare.cloudflared
```

Feche e abra o terminal depois de instalar (para o PATH atualizar). Confira com `cloudflared --version`. O túnel rápido (quick tunnel) não precisa de conta no Cloudflare.

### 1.2 Conferir os outros programas

- Docker Desktop aberto e pronto (ícone da baleia parado).
- `dotnet --version`, `node --version` e `npm --version` respondendo.

### 1.3 Conferir os arquivos de segredo

Na pasta `C:\secrets\imperatle\` precisam existir:

| Arquivo | O que é |
|---|---|
| `google_client_secret.txt` | chave secreta do cliente OAuth do Google (já existe) |
| `paddle_sandbox_tunnel_secret.txt` | secret key do destino de webhook do túnel (você cria no passo 3) |

O client token (`test_c9c21a5a71900db74b134bc6aa4`), o price id (`pri_01m6h7q44g7qj2jh2b75h3ap5w`) e o client id do Google não são segredo e já estão no script.

Regra de sempre: segredo só em `C:\secrets`, nunca no git, nunca colado no chat.

---

## 2. Subir tudo

Na raiz do repositório (a pasta que tem o `docker-compose.yml`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1
```

Na primeira vez o arquivo `paddle_sandbox_tunnel_secret.txt` ainda não existe, então o script para com "Arquivo não encontrado". Isso é esperado: faça o passo 3 e rode de novo. Para descobrir a URL do túnel antes de ter o segredo, dá para abrir o túnel sozinho uma vez:

```powershell
cloudflared tunnel --url http://localhost:5055
```

Só que a URL do túnel rápido **muda a cada vez que ele abre**. O jeito mais simples é: criar o destino na Paddle com uma URL qualquer (passo 3), salvar o segredo, rodar o script e então **editar a URL do destino** para a que o script mostrou. Editar a URL não troca a secret key.

Quando der certo, o script termina mostrando algo assim:

```
Tudo no ar. Cole este endereco no destino de teste da Paddle sandbox:

    https://palavras-aleatorias.trycloudflare.com/webhooks/paddle

Teste rapido do tunel: https://palavras-aleatorias.trycloudflare.com/health
```

Abra o endereço do `/health` no navegador: tem que aparecer `{"status":"ok"}`. Se aparecer, a internet já alcança a sua API.

Janelas que ficam abertas:

- **Imperatle API (sandbox)**: `dotnet run`. É aqui que aparecem os logs do webhook.
- **Imperatle web (sandbox)**: `npm run dev` (na primeira vez roda `npm ci` antes, demora alguns minutos).
- **cloudflared** (minimizada): o túnel. O log fica em `%TEMP%\imperatle-sandbox-tunnel.log`.

---

## 3. Segundo destino de webhook na Paddle sandbox

O destino que já existe (apontando para `https://api.imperatle.com/webhooks/paddle`) fica como está. Crie outro só para o teste.

1. Entre em <https://sandbox-vendors.paddle.com> e confira que está no **sandbox** (o painel mostra a faixa de sandbox).
2. **Developer tools > Notifications > New destination** (em algumas telas o menu aparece como **Events > Notifications**).
   - Description: `Imperatle tunel local (teste)`.
   - Type: **Webhook**.
   - URL: `https://<o-endereço-do-túnel>/webhooks/paddle` (o que o script mostrou).
   - Usage type: **Platform** ou **Both** (o importante é receber os eventos da plataforma, não só simulações).
   - Eventos: marque exatamente os três que a API trata:
     - `transaction.completed`
     - `adjustment.created`
     - `adjustment.updated`
3. Salve e copie a **Secret key** (começa com `pdl_ntfset_`). Ela é diferente da secret do outro destino.
4. Grave a chave no arquivo, sem mostrar nada na tela (cole quando o PowerShell pedir):

   ```powershell
   $s = Read-Host 'Secret key do destino do tunel' -AsSecureString
   [System.Net.NetworkCredential]::new('', $s).Password | Set-Content -NoNewline -Encoding ascii C:\secrets\imperatle\paddle_sandbox_tunnel_secret.txt
   Remove-Variable s
   ```

5. Se a API já estava rodando com outro segredo, pare e suba de novo (a API só lê o segredo na subida):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop
   powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1
   ```

   Lembre: o túnel novo tem URL nova. Atualize a URL do destino na Paddle.

### 3.1 Conferir a assinatura antes de comprar (opcional, recomendado)

**Developer tools > Simulations > New simulation**, escolha o destino do túnel e o evento `transaction.completed`, e rode. Na janela da API:

- certo: aparece `Paddle transaction.completed evt_...: Ignored` (o preço da simulação não é o do Apoio) ou um aviso de "no valid custom_data.userId". A API respondeu 200; ninguém virou apoiador, como esperado;
- errado: `Paddle webhook rejected: signature Mismatch` (ver seção 7).

---

## 4. Entrar com Google e comprar

1. Abra **<http://localhost:3000>** (use `localhost`, não `127.0.0.1`: o login e o CORS só aceitam `localhost`).
2. Menu > **Entrar** > **Entrar com Google**. A tela do Google volta para `http://localhost:5055/signin-google` (já cadastrado no Google Cloud) e depois para o site, logado.
3. Menu > **Apoiar o projeto** > **Quero apoiar**. O checkout da Paddle abre por cima do site, com a faixa de sandbox.
4. Pague com o cartão de teste:
   - número `4242 4242 4242 4242`;
   - validade: qualquer data futura (ex.: `12/30`);
   - CVC `100`;
   - nome e e-mail: qualquer um (o e-mail do Google já vem preenchido).
5. A Paddle mostra a confirmação e o site mostra o "Obrigado!". O site pergunta o `/me` algumas vezes seguidas; quando o webhook chega, o Apoio aparece sem recarregar a página.

---

## 5. Conferir o Apoio

### 5.1 Na janela da API

Logo depois da compra deve aparecer:

```
Paddle transaction.completed evt_...: Granted
```

### 5.2 No site

- O menu mostra o selo **Apoiadores**.
- **Jogos anteriores** (`/pt/archive`) abre a lista de dias.
- **Treino** (`/pt/practice`): só libera depois que o jogo do dia acabar (ganho ou perdido). Antes disso aparece "Primeiro, o desafio de hoje", o que é o comportamento certo.

### 5.3 No banco

```powershell
docker compose -p imperatle exec postgres psql -U imperatle -d imperatle_sandbox -c 'SELECT "Email", "SupporterSinceUtc", "PaddleTransactionId" FROM "Users";'
docker compose -p imperatle exec postgres psql -U imperatle -d imperatle_sandbox -c 'SELECT "Id", "EventType", "TransactionId", "Outcome", "ProcessedAtUtc" FROM "ProcessedWebhookEvents" ORDER BY "ProcessedAtUtc";'
```

O seu usuário tem que ter `SupporterSinceUtc` preenchido e `PaddleTransactionId` igual ao id da transação na Paddle (`txn_...`). Na outra tabela aparece o evento com `Outcome = granted`.

### 5.4 Na Paddle

**Developer tools > Notifications >** destino do túnel **> Logs**: a entrega de `transaction.completed` com resposta **200**.

---

## 6. Reembolsar e ver o Apoio sumir

1. Na Paddle sandbox: **Transactions >** a transação da compra **> Refund**, reembolso **total** (todos os itens, valor inteiro). Reembolso parcial não tira o Apoio, de propósito.
2. A Paddle manda `adjustment.created` na hora, ainda **pendente de aprovação**. Na janela da API:

   ```
   Paddle adjustment.created evt_...: Ignored
   ```

   Isso é o certo: enquanto o reembolso não for aprovado, o Apoio continua.
3. No sandbox a Paddle aprova o reembolso sozinha depois de alguns minutos (cerca de 10). Aí chega `adjustment.updated`:

   ```
   Paddle adjustment.updated evt_...: Revoked
   ```

4. Confira:
   - recarregue o site: o selo **Apoiadores** sumiu e arquivo e treino mostram o convite para apoiar;
   - no banco (consulta do 5.3): `SupporterSinceUtc` e `PaddleTransactionId` voltaram a vazio, e há um evento com `Outcome = refunded`.

Dá para comprar de novo depois disso com a mesma conta, se quiser repetir o teste.

---

## 7. O que costuma dar errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Na API: `Paddle webhook rejected: signature Mismatch` | O segredo no arquivo não é o do destino do túnel (por exemplo, é o do destino de produção), ou tem espaço/quebra de linha a mais | Copiar a Secret key do destino certo, gravar de novo (passo 3.4) e reiniciar com `-Stop` e o script |
| `signature Missing` | `paddle_sandbox_tunnel_secret.txt` vazio, ou a API subiu sem o script | Subir sempre pelo script |
| `signature Stale` | Relógio do PC muito fora da hora (tolerância de 5 minutos) | Sincronizar o relógio do Windows (Configurações > Hora > Sincronizar agora) |
| Nada aparece na API e o log da Paddle mostra erro 530, 502 ou "could not connect" | O túnel caiu ou foi reiniciado e a **URL mudou** | Ver a URL atual (script de novo, ou o log do cloudflared) e editar a URL do destino na Paddle. Dá para reenviar o evento pelos Logs do destino |
| Log da Paddle mostra 404 | URL do destino sem `/webhooks/paddle` no fim | Corrigir a URL |
| `Paddle transaction ... has the Supporter price but no valid custom_data.userId` | Compra feita fora do site (link de pagamento, simulação) | Comprar pelo botão "Quero apoiar", logado |
| `Paddle transaction ... is for unknown user` | O evento chegou numa API com outro banco (ex.: compra feita com a API apontando para `imperatle_dev`) | Subir pelo script e repetir; o evento não fica marcado, então dá para reenviar pelos Logs da Paddle |
| Compra concluída mas o log diz `Ignored` | `Paddle__SupporterPriceId` diferente do preço comprado | Conferir o price id no script e no produto da sandbox |
| Botão "Quero apoiar" não aparece ("ainda não está disponível") | O site subiu sem as variáveis `NEXT_PUBLIC_PADDLE_*` | Parar o `npm run dev` que estava aberto antes e subir pelo script |
| Logado no Google mas o site continua mostrando "Entrar" | Site aberto em `127.0.0.1` ou outra porta, ou `Auth__CookieDomain` preenchido | Usar `http://localhost:3000`; o script já deixa o `Auth__CookieDomain` vazio |
| Erro de CORS no console do navegador | Site fora de `http://localhost:3000` (o `appsettings.Development.json` só libera essa origem) | Usar exatamente esse endereço |
| `redirect_uri_mismatch` no Google | A API não está em `http://localhost:5055` | Subir pelo script (perfil `http`, porta 5055) |
| Script diz que a porta 5055 ou 3000 está em uso | API ou site rodando de antes, sem as variáveis do sandbox | Fechar essas janelas (ou `-Stop`) e rodar de novo |
| `cloudflared` falha ao abrir o túnel rápido | Existe um `config.yml` em `%USERPROFILE%\.cloudflared` | Renomear esse arquivo enquanto testa |

Observação: o destino de produção (`api.imperatle.com`) também recebe os eventos desta compra de teste. Se a API de produção estiver com o segredo live, ela responde 401 e a Paddle tenta de novo algumas vezes; isso não muda nada em produção e pode ser ignorado.

---

## 8. Limpar no fim

1. Parar API, site e túnel:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop
   ```

   O Postgres continua rodando; para parar: `docker compose -p imperatle stop`.
2. Na Paddle sandbox: **Developer tools > Notifications >** destino do túnel **> Delete**. A URL do túnel morre quando ele fecha, e um destino apontando para o nada só gera erro e tentativa de novo.
3. Apagar o segredo do túnel (ele deixa de valer junto com o destino):

   ```powershell
   Remove-Item C:\secrets\imperatle\paddle_sandbox_tunnel_secret.txt
   ```

4. Opcional, para começar do zero numa próxima vez: apagar o banco de teste.

   ```powershell
   docker compose -p imperatle exec postgres psql -U imperatle -d postgres -c 'DROP DATABASE imperatle_sandbox;'
   ```

Enquanto o túnel está aberto, **qualquer pessoa com a URL alcança a sua API local**, inclusive os botões DEV (que só existem em Development). A URL é aleatória e some quando o túnel fecha, mas não deixe o túnel aberto sem estar testando.

---

## 9. Marcar no checklist

Com tudo certo, dá para marcar em `docs/launch/paddle-setup.md`, seção 4:

- [ ] Compra de teste no sandbox ponta a ponta.
- [ ] Reembolso de teste no sandbox tira o Apoio.
- [ ] Log do webhook na Paddle mostrando respostas 200.
