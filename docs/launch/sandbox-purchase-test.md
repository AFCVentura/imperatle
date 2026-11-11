# Teste de compra no modo de teste da Stripe (no seu PC)

Roteiro para testar o Apoio de ponta a ponta com dinheiro de mentira: entrar com Google, comprar com o cartão de teste, ver o Apoio ligar, reembolsar e ver o Apoio sumir. Tudo roda no seu computador; não precisa de túnel.

Como funciona:

```
navegador (localhost:3000) --"Quero apoiar"--> API (localhost:5055) --cria a sessão--> Stripe (modo de teste)
navegador --paga na página da Stripe--> volta pro site
Stripe --evento--> stripe listen (no seu PC) --> API /webhooks/stripe --> Postgres (imperatle_sandbox)
```

O que o script `scripts/sandbox-test.ps1` faz por você:

- confere se a Stripe CLI, Docker, .NET e Node estão instalados e se as portas 5055 e 3000 estão livres;
- lê a chave secreta de **teste** e o segredo do Google sem mostrar os valores, e **recusa rodar** com uma chave `live`;
- sobe o Postgres (`docker compose`) e cria um banco separado, `imperatle_sandbox` (o `imperatle_dev` não é tocado);
- abre três janelas: a API, o site e o `stripe listen`, que repassa os eventos da Stripe para a API local.

Nada disso mexe em produção nem no `.env.local` do site: as variáveis valem só para as janelas abertas pelo script.

## Antes da primeira vez

- Stripe CLI: `winget install --id Stripe.StripeCli` (depois abra um terminal novo).
- Arquivos de segredo (fora do repositório):
  - `C:\secrets\stripe-imperatle-test.txt`, linha 1: a chave secreta de teste (`sk_test_...`);
  - `C:\secrets\imperatle\google_client_secret.txt`: o segredo do cliente OAuth do Google.
- O preço de teste já está no script (`-PriceId`); troque se criar outro.

## Passo a passo

1. Abra o **Docker Desktop** e espere ficar pronto. Feche programas pesados antes.
2. Num terminal **novo**:
   ```
   cd <pasta do repositório>
   powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1
   ```
   Na primeira vez o site demora (instala pacotes).
3. Abra `http://localhost:3000` e entre com o Google.
4. Menu > **Apoiar o projeto**. Confira o preço e clique em **Quero apoiar**.
5. Na página da Stripe, pague com o cartão `4242 4242 4242 4242`, qualquer validade futura e qualquer CVC.
6. Deve acontecer:
   - [ ] volta para o site com "Obrigado!" e, em seguida, "Suas vantagens de apoiador já estão ativas";
   - [ ] na janela do `stripe listen`: `checkout.session.completed` com `[200]`;
   - [ ] na janela da API: `Stripe checkout.session.completed ...: Granted`;
   - [ ] Menu > Treino e Jogos anteriores liberados;
   - [ ] "Apoiar o projeto" de novo mostra "Você apoia o Imperatle. Obrigado!" e não deixa comprar outra vez; o rodapé mostra o agradecimento.
7. **Reembolso**: no painel da Stripe (modo de teste) > Transações > o pagamento > **Reembolsar** o valor total.
   - [ ] no `stripe listen`: `charge.refunded [200]`; na API: `Revoked`;
   - [ ] recarregando o site, o Treino volta a ficar trancado.
8. Opcional: **cancelar** (voltar na página da Stripe) traz de volta ao site com o diálogo de apoio aberto.
9. Para desligar tudo:
   ```
   powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop
   ```
   O Postgres continua rodando (`docker compose -p imperatle stop` para parar).

Se algo der errado, guarde o texto das janelas da API e do `stripe listen` (nunca as chaves).
