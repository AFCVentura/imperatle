# Paddle: configurar o Apoio (passo a passo)

Guia para o dono do projeto. O código já está pronto; falta criar as contas na Paddle, cadastrar o produto e copiar as chaves para as variáveis de ambiente. Tudo começa no **sandbox** (ambiente de teste, dinheiro de mentira) e só depois vai para a conta **live**.

Resumo de como funciona:

1. O jogador clica em "Apoiar o projeto", entra com Google (comprar exige conta) e clica em "Quero apoiar".
2. Abre o checkout da Paddle por cima do site, com o id do usuário em `customData.userId`.
3. Quando o pagamento termina, a Paddle chama `POST /webhooks/paddle` na API. A API confere a assinatura, marca o usuário como apoiador (`SupporterSinceUtc`) e guarda o id do evento para não aplicar duas vezes.
4. Se a compra for reembolsada por inteiro (ou virar chargeback), a Paddle manda outro evento e a API tira o Apoio.

A Paddle é a **merchant of record**: ela é quem vende de fato, cobra, recolhe os impostos de cada país (IVA, sales tax etc.), emite o recibo e cuida dos reembolsos. Você recebe o valor líquido.

---

## 1. Conta sandbox (teste)

1. Crie a conta em <https://sandbox-vendors.paddle.com/signup>. O sandbox não pede verificação de identidade nem de site.
2. Pode usar o mesmo e-mail da conta live depois; são contas separadas.

### 1.1 Produto e preço

1. No painel: **Catalog > Products > New product**.
   - Nome: `Imperatle Supporter` (é o que aparece no checkout e no recibo).
   - Tax category: **Standard digital goods**.
   - Descrição curta, por exemplo: `Lifetime supporter of Imperatle: past games, practice mode and no ads.`
2. Dentro do produto: **New price**.
   - Tipo: **One-time** (sem ciclo de cobrança; não é assinatura).
   - Valor base: **USD 4.99**.
   - Tax mode: recomendo **Account setting** com a conta configurada para preço com imposto incluso, assim o valor que aparece é o valor final (importante no Brasil e na Europa).
   - **Price overrides** (preço por país): adicione os países onde US$ 4,99 fica caro ou estranho. Sugestões para você decidir:
     - Brasil: `BRL 14.90`
     - Índia: `INR 199`
     - México: `MXN 59`
     - Zona do euro: `EUR 4.99`; Reino Unido: `GBP 3.99`
   - O site mostra o preço certo para cada visitante sozinho: ele pergunta à Paddle (price preview) e a Paddle descobre o país pelo IP.
3. Copie o **price id** (começa com `pri_`). Ele vai em duas variáveis (ver seção 3).

### 1.2 Token do navegador (client-side token)

1. **Developer tools > Authentication > Client-side tokens > New client-side token**.
2. Nome: `imperatle-web`. Copie o valor (começa com `test_` no sandbox).
3. Esse token é público por natureza (vai no JavaScript do site); não é segredo.

### 1.3 Link padrão do checkout

1. **Checkout > Checkout settings > Default payment link**: coloque `https://imperatle.com/en`.
2. A Paddle exige esse campo preenchido antes de abrir qualquer checkout.

### 1.4 Webhook (notificação de compra e reembolso)

1. **Developer tools > Notifications > New destination**.
   - Tipo: **Webhook**.
   - URL: `https://<endereço-da-api>/webhooks/paddle` (o endereço público da API no Azure Container Apps, o mesmo que o site usa em `NEXT_PUBLIC_API_URL`).
   - API version: a mais recente.
   - Eventos (marque só estes três):
     - `transaction.completed`: compra concluída, libera o Apoio.
     - `adjustment.created` e `adjustment.updated`: reembolso ou chargeback; quando é total e aprovado, tira o Apoio.
2. Salve e abra o destino criado: copie a **Secret key** (começa com `pdl_ntfset_`). Essa sim é segredo.

### 1.5 Testar a compra no sandbox

- Cartão de teste: `4242 4242 4242 4242`, qualquer validade futura, CVC `100`.
- A Paddle precisa alcançar a API pela internet. Em produção isso já acontece; para testar com a API rodando no seu computador, use um túnel (por exemplo `cloudflared tunnel --url http://localhost:5055`) e cadastre a URL do túnel num destino de teste.
- **Developer tools > Simulations** manda eventos de exemplo para o destino, bom para conferir a assinatura. O evento simulado não traz um `userId` seu, então a API responde 200 mas não marca ninguém (fica registrado no log como usuário não encontrado).
- Reembolso no sandbox: **Transactions >** a transação **> Refund**. No sandbox a Paddle aprova os reembolsos sozinha a cada ~10 minutos; depois disso o Apoio some da conta.
- Em **Developer tools > Notifications > (destino) > Logs** dá para ver cada entrega, a resposta da API e reenviar um evento.

---

## 2. Conta live (dinheiro de verdade)

1. Crie a conta em <https://vendors.paddle.com/signup>. Na hora do cadastro, escolha se vende como **pessoa física / sole trader** (com CPF) ou como **empresa** (CNPJ, por exemplo MEI). Confirme no formulário que o Brasil aparece como país aceito para o seu tipo de cadastro.
2. A verificação tem três fases. Para pessoa física, a de empresa não se aplica:
   - **Domain review (revisão do site)**: a Paddle abre imperatle.com e confere:
     - site no ar, com HTTPS;
     - descrição clara do que é vendido e **preço visível sem login** (o diálogo "Apoiar o projeto" mostra o preço mesmo para quem não entrou);
     - **Termos de Uso** com o seu **nome legal** e citando a Paddle como merchant of record (o texto já cita a Paddle; falta trocar "Ventura" pelo seu nome completo, ver seção 5);
     - **Política de Reembolso** com prazo entre 14 e 90 dias (a nossa dá 14 dias, em `/refunds`);
     - **Política de Privacidade** (em `/privacy`).
     - Costuma ser automática; revisão manual leva alguns dias úteis.
   - **Identity verification (identidade)**: feita pela Sumsub, parceira da Paddle. Pede documento oficial com foto (RG, CNH ou passaporte), comprovante de endereço e às vezes um vídeo curto de selfie. Normalmente é na hora; manual leva de 1 a 3 dias úteis.
3. Depois de aprovada, **refaça na conta live tudo da seção 1** (produto, preço, overrides, token, link padrão, webhook). Os ids do sandbox não valem no live: o price id muda, o token passa a começar com `live_` e a secret key é outra.
4. **Payouts** (recebimento): cadastre a conta para receber (transferência internacional ou Payoneer, conforme as opções que a Paddle mostrar para o Brasil). A Paddle paga uma vez por mês, já descontada a taxa dela.
5. Impostos no Brasil: a Paddle recolhe os impostos de venda dos compradores, mas o que ela te paga é renda vinda do exterior. Como declarar (carnê-leão como pessoa física ou nota de exportação pelo CNPJ) é assunto para um contador.

---

## 3. Variáveis de ambiente

| Variável | Onde | Valor |
|---|---|---|
| `Paddle__WebhookSecret` | API (Azure Container Apps, como **secret**) | Secret key do destino de webhook (`pdl_ntfset_...`) |
| `Paddle__SupporterPriceId` | API | Price id (`pri_...`) |
| `Paddle__Environment` | API | `sandbox` ou `production` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Site (Vercel) | Client-side token (`test_...` ou `live_...`) |
| `NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID` | Site (Vercel) | O mesmo price id |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Site (Vercel) | `sandbox` ou `production` (tem que bater com o token) |

Opcional: `Paddle__WebhookToleranceSeconds` (padrão 300) é quanto tempo um webhook assinado pode ter antes de ser recusado como velho.

Observações:

- As variáveis `NEXT_PUBLIC_*` entram no site na hora do build: depois de mudar na Vercel, faça um novo deploy.
- Sem `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` e `NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID`, o diálogo mostra "ainda não está disponível" no lugar do botão. Dá para subir o código antes de ligar a venda.
- Localmente: `apps/web/.env.local` para as do site e `dotnet user-secrets` (ou variáveis de ambiente) para as da API.

---

## 4. Checklist antes de ligar no live

- [ ] Compra de teste no sandbox ponta a ponta: entrar com Google, comprar, ver "Obrigado!" e o Apoio ativo.
- [ ] Reembolso de teste no sandbox tira o Apoio.
- [ ] Log do webhook na Paddle mostrando respostas 200.
- [ ] Textos legais revisados por você (seção 5).
- [ ] Conta live aprovada, produto e webhook recriados no live, variáveis trocadas para os valores live e novo deploy do site.
- [ ] Uma compra real sua de US$ 4,99, seguida de reembolso, para conferir o fluxo de verdade.

---

## 5. O que você precisa revisar e decidir

- **Textos legais**: Termos de Uso, Política de Privacidade e Política de Reembolso (pt e en, em `apps/web/src/lib/legal.ts`) foram escritos pelo agente e **não são revisão jurídica**. Leia tudo. Em especial:
  - o seu **nome legal completo** (e CNPJ, se vender como empresa) nos Termos, que a Paddle exige;
  - o prazo de reembolso (14 dias, sem precisar de motivo);
  - "para sempre / enquanto o jogo existir" na descrição do Apoio.
- **Preço**: US$ 4,99 e os overrides por país são sugestão.
- **Nome do produto** que aparece no recibo.
