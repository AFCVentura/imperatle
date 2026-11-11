# Stripe: configurar o Apoio (passo a passo)

Guia para o dono do projeto. O código já está pronto; falta configurar a conta da Stripe e copiar as chaves para as variáveis da API. Tudo começa no **modo de teste** (dinheiro de mentira) e só depois vai para o **modo live**.

Resumo de como funciona:

1. O jogador clica em "Quero apoiar" (precisa estar logado).
2. A API cria uma sessão de pagamento na Stripe (`POST /support/checkout`) e o navegador vai para a página de pagamento da própria Stripe. A chave secreta fica só no servidor, e quem já é apoiador nunca é cobrado de novo.
3. Depois de pagar, o jogador volta para o site com o "Obrigado!" (`?support=thanks`). Se cancelar, volta com o diálogo de apoio aberto (`?support=1`).
4. A Stripe avisa a API pelo webhook (`POST /webhooks/stripe`). A API confere a assinatura, marca a conta como apoiadora e guarda o id do evento para não aplicar duas vezes. Boleto e meios parecidos só liberam quando o dinheiro cai.
5. Reembolso total ou contestação perdida tiram o Apoio. Reembolso parcial e contestação ganha não tiram.

Quem vende é o autor (pessoa física, CPF); a Stripe só processa o pagamento. Os textos legais (`apps/web/src/lib/legal.ts`) já dizem isso.

## 1. Conta

- Pessoa física (CPF), setor **Software como serviço**, site **imperatle.com**.
- Nome na fatura: **JVENTURA** (o nome do produto é acrescentado na hora da compra).
- Repasse numa conta brasileira em reais no mesmo CPF (a Stripe Brasil não paga em conta no exterior).
- Antifraude: **Radar Lite**, incluso.

## 2. Modo de teste

1. No painel, ligue **Modo de teste** (canto superior direito).
2. **Produtos > Adicionar produto**: "Imperatle Supporter", pagamento **único**, preço padrão **US$ 4,99**. Em **Preços por moeda** acrescente **R$ 9,90** e **EUR 4,99**. A Stripe escolhe a moeda pela localização de quem compra; quem não está no Brasil nem na zona do euro paga em dólar.
3. Copie o id do preço (`price_...`).
4. **Desenvolvedores > Chaves de API**: copie a **chave secreta** (`sk_test_...`). Guarde fora do repositório (por exemplo `C:\secrets\stripe-imperatle-test.txt`, linha 1).
5. Para testar no seu computador não precisa cadastrar webhook: o `stripe listen` repassa os eventos para a API local. Roteiro completo em [sandbox-purchase-test.md](sandbox-purchase-test.md).

## 3. Modo live (produção)

1. Desligue o modo de teste.
2. Crie o mesmo produto e o mesmo preço (US$ 4,99 / R$ 9,90 / EUR 4,99) e copie o `price_...` de produção.
3. **Desenvolvedores > Webhooks > Adicionar endpoint**:
   - URL: `https://api.imperatle.com/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.closed`
   - Ao salvar, copie o **segredo de assinatura** (`whsec_...`).
4. **Configurações > E-mails de clientes**: ligue **Pagamentos bem-sucedidos**. O diálogo do jogo promete o recibo por e-mail.
5. Confira o nome na fatura (**JVENTURA**).
6. Copie a **chave secreta live** (`sk_live_...`) e guarde fora do repositório (`C:\secrets`).

## 4. Variáveis da API (Azure Container Apps)

| Variável | Como | Valor |
|---|---|---|
| `Stripe__SecretKey` | **secret** | `sk_live_...` |
| `Stripe__WebhookSecret` | **secret** | `whsec_...` do endpoint de produção |
| `Stripe__SupporterPriceId` | variável comum | `price_...` de produção |

Apague as variáveis `Paddle__*` que sobraram. O site não precisa de nenhuma variável de pagamento.

## 5. Conferir em produção

1. O diálogo "Apoiar o projeto" mostra o preço (vem de `GET /support/price`).
2. Uma compra real de R$ 9,90 com a sua conta: volta com "Obrigado!", e o Treino e os Jogos anteriores abrem.
3. No painel da Stripe, **Webhooks >** o endpoint **> Tentativas**: os eventos com resposta `200`.
4. **Reembolse** o pagamento inteiro: o Apoio some da conta (recarregue o site).

## 6. Reembolsos

Os pedidos chegam em contato@imperatle.com ou pelo formulário de Feedback. Reembolso pelo painel: **Transações >** o pagamento **> Reembolsar** o valor total. A política (`/refunds`) promete reembolso em até 14 dias da compra e resposta em até 15 dias.
