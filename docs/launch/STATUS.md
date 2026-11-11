# Lançamento: status da branch `feat/launch`

Atualizado em 3 de novembro de 2026. Nada aqui foi para o `main`, nada foi enviado (push) nem publicado (deploy).

> **11/11/2026: o pagamento do Apoio trocou a Paddle pela Stripe.** O que este documento diz da Paddle ficou como registro do lançamento; as instruções que ainda valem foram atualizadas abaixo. Configuração da Stripe: [stripe-setup.md](stripe-setup.md); teste local: [sandbox-purchase-test.md](sandbox-purchase-test.md). A 1.5.0 também traz as dicas repaginadas (uma por erro, comparação de área, época e distância, contorno do palpite no mapa).

## O que a branch tem

A `feat/launch` saiu do `origin/main` e junta as três branches dos agentes, com merges de verdade (o histórico de cada uma fica):

1. **Contas (`feat/accounts`)**: login só com Google, feito na API (cookie `imperatle_session`, HttpOnly, SameSite=Lax). Entidade `User`, `ICurrentPlayer` real (`HttpCurrentPlayer`), `GET /me`, `DELETE /me` (LGPD/GDPR), `AccountDialog` no menu. No primeiro login os jogos do cookie anônimo (`imperatle_aid`) passam para a conta; se o mesmo dia existe nos dois, vale o da conta.
2. **Apoio (`feat/support`)**: compra única "Apoiador (vitalício)" pela Paddle. `POST /webhooks/paddle` confere a assinatura, é idempotente (`ProcessedWebhookEvents`), liga o apoio no `transaction.completed` e desliga em reembolso total ou chargeback. `SupportDialog` com o checkout overlay da Paddle.js, página de reembolso (`/refunds`) e textos legais.
3. **Vantagens (`feat/perks`)**: jogos passados (`/archive`) e modo treino (`/practice`), só para apoiadores, com a checagem no servidor (403 para o resto). `PracticeSession`, flag `FromArchive` (jogo passado não conta nas estatísticas nem na sequência), `PlayBoard` reaproveitado nas três telas, faixas de dificuldade em `apps/api/Content/practice-difficulty.json`.

Em cima dos merges (commits próprios da integração):

- Os stubs (`DevCurrentPlayer` das duas branches, o `me.ts` provisório de cada uma) saíram. Fica um `me.ts` só (`getMe`, `useMe`, `refreshMe`, `googleLoginUrl`, `logout`, `deleteAccount`), usado pelo menu, pela conta, pelo apoio e pelas vantagens. O `ComingSoonDialog` foi apagado: conta e apoio agora existem de verdade.
- `Dev:IsSupporter` continua, mas como um embrulho só de Development em volta do jogador real (`DevSupporterCurrentPlayer`): login e cookie funcionam igual à produção, só a checagem de apoiador responde "sim".
- Uma regra só para "de quem é este jogo" (`AccountService.ProgressOf`): logado, as linhas da conta mais as linhas ainda sem dono deste navegador; deslogado, as deste navegador. Jogo do dia, estatísticas, arquivo, treino e botões DEV usam a mesma regra. Antes, as estatísticas ainda liam só o cookie anônimo.
- Bug do segundo aparelho resolvido: cada palpite fica guardado no servidor (`PlayerChallengeProgress.GuessedSlugs`). `GET /challenges/today/progress` (e a resposta de cada dia do arquivo) devolve os palpites com as comparações, e o tabuleiro se reconstrói com os palpites reais. Jogos de antes desta versão continuam aparecendo com linhas "Palpite feito em outro aparelho".
- O login também leva para a conta as rodadas de treino feitas deslogado, e excluir a conta apaga essas rodadas.
- `GET /practice/pool` com as opções na query string ganhou teste pelo pipeline real do MVC (TestServer). Já funcionava; agora está coberto.
- O menu mostra o selo "Apoiadores" pelo `isSupporter` real do `/me`.
- No `SupportDialog`, quem já é apoiador não chega ao checkout por nenhum caminho: além de não ver o botão, o `/me` é consultado de novo logo antes de abrir a Paddle.
- Espaço reservado para anúncio (`AdSlot`, logo abaixo do conteúdo da página): hoje não mostra nada para ninguém (`ADS_ENABLED = false` em `apps/web/src/lib/ads.ts`) e nunca vai mostrar para apoiador.
- Uma migration só, `LaunchAccountsSupportPerks`, gerada do modelo final (as três migrations dos agentes foram apagadas). Testada num Postgres 17 de verdade, de novo depois das correções do QA (banco novo do zero).
- Correções depois do QA (branch `feat/launch-qa`):
  - **Treino só depois do jogo do dia** (M2): todos os endpoints de `/practice` respondem 409 `daily_not_finished` até o jogo do dia acabar (ganho ou perdido), pela mesma regra de dono do jogo do dia (o 403 de quem não apoia vem antes). Depois disso o treino pode sortear qualquer império, inclusive o do dia. A página de treino mostra "Primeiro, o desafio de hoje" com o botão para o jogo, e o fim do jogo do dia tem "Ir pro treino" para apoiadores.
  - **Palpites ao mesmo tempo** (B4): a linha do jogo (`PlayerChallengeProgress`) e a rodada de treino (`PracticeSession`) usam o `xmin` do Postgres como token de concorrência. Um palpite que perde a corrida (ou dois primeiros palpites criando a mesma linha) é refeito a partir de uma leitura nova, até 6 vezes; depois disso a API responde 409 `guess_conflict` em vez de 500.
  - **Logout de verdade no servidor** (I1): cada login cria uma linha em `UserSessions` e o id dela vai no cookie; cada pedido confere a linha (uma busca pela chave, sem cache, então vale na hora em todas as réplicas). Sair revoga a sessão deste navegador; "Sair de todos os aparelhos" (`POST /auth/logout?all=true`) revoga todas; excluir a conta apaga todas. Cookie sem id de sessão é recusado.
  - **Compartilhar jogo anterior**: o texto usa a chave `Share.archiveTitle` ("Treino #N" / "Practice #N" por enquanto) em vez de "Imperatle #N"; o compartilhamento do jogo do dia não mudou.
  - Tudo isso está dentro da migration única `LaunchAccountsSupportPerks` (tabela `UserSessions` e o mapeamento do `xmin`, que não gera SQL).
- Next.js 16.4.0 para 16.4.4 (e `eslint-config-next` igual), num commit separado (`chore(web): upgrade next to 16.4.4 for a security fix`) para dar para reverter sozinho.

## Como rodar localmente com apoiador de mentira

1. Banco: `docker compose up -d` na raiz. Use um banco separado para não mexer no `imperatle_dev`:
   ```
   docker exec imperatle-postgres-1 psql -U imperatle -d postgres -c "CREATE DATABASE imperatle_launch;"
   ```
2. API (a migration roda sozinha na subida):
   ```
   cd apps/api
   $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=imperatle_launch;Username=imperatle;Password=imperatle"
   $env:Dev__IsSupporter = "true"
   dotnet run --launch-profile http        # http://localhost:5055
   ```
   Sem `Dev__IsSupporter` (ou com `false`), arquivo e treino respondem 403, como em produção para quem não é apoiador.
3. Site: `apps/web/.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:5055`, depois `npm ci` e `npm run dev` (http://localhost:3000).
4. Login com Google localmente: precisa de `Auth__Google__ClientId` e `Auth__Google__ClientSecret` (ver `docs/launch/google-oauth-setup.md`). Sem eles, o resto funciona e o botão de entrar volta com mensagem de erro.
5. Compra de teste localmente: `scripts/sandbox-test.ps1` sobe tudo com a chave de teste da Stripe e o `stripe listen` (ver `docs/launch/sandbox-purchase-test.md`).

Observação: com `Dev:IsSupporter` e **sem** login, as páginas de arquivo e treino abrem, mas o selo "Apoiadores" continua no menu, porque o `/me` de quem não está logado não tem usuário. Logado, o `/me` também diz apoiador.

## O que você precisa fazer à mão

- **Google OAuth**: criar o cliente OAuth "Aplicativo da Web" no Google Cloud, cadastrar `https://api.imperatle.com/signin-google` (e `http://localhost:5055/signin-google` para testar), preencher a tela de consentimento. Passo a passo em `docs/launch/google-oauth-setup.md`.
- **Stripe**: produto e preço de produção (US$ 4,99 / R$ 9,90 / EUR 4,99), webhook para `https://api.imperatle.com/webhooks/stripe` com os cinco eventos, e-mail de recibo ligado. Passo a passo em `docs/launch/stripe-setup.md`.
- **Variáveis no Azure (API)**: `Auth__Google__ClientId`, `Auth__Google__ClientSecret` (secret), `Auth__CookieDomain=imperatle.com`, `Stripe__SecretKey` (secret), `Stripe__WebhookSecret` (secret), `Stripe__SupporterPriceId`. Apagar as `Paddle__*`. Conferir que `Cors__AllowedOrigins` tem `https://imperatle.com,https://www.imperatle.com`. A API precisa estar num subdomínio do site (ex.: `api.imperatle.com`) para o cookie de login valer nos dois.
- **Variáveis do site**: só `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics), como variável do repositório no GitHub; as `NEXT_PUBLIC_PADDLE_*` podem ser apagadas. Ela entra no build: mudar e fazer novo deploy.
- **Vercel Hobby não permite uso comercial.** Decidido: o site vai para um segundo Container App, no mesmo ambiente da API. Imagem, job de deploy (desligado até `AZURE_DEPLOY_WEB = true`) e passo a passo prontos; analytics trocado pela Cloudflare e textos legais já falando em Azure (branch `feat/front-azure`). Checklist com o Azure CLI: `docs/launch/front-container-apps.md`.
- **Revisão jurídica**: política de privacidade, termos e reembolso foram escritos pelos agentes (pt e en), não por advogado. A Paddle também exige termos e política de reembolso publicados para aprovar a conta.
- **Faixas de dificuldade do treino**: revisar `apps/api/Content/practice-difficulty.json` (quais impérios são fácil, médio e difícil; os que não estão na lista caem numa faixa pela área máxima). O conteúdo é escolha sua.
- **Banco de produção**: a migration roda sozinha na subida da API. Ela cria tabelas novas (inclusive `UserSessions`) e duas colunas em `PlayerChallengeProgress` (as linhas antigas ficam com a lista de palpites vazia). Vale um backup do Neon antes do primeiro deploy.
- **Changelog**: ao publicar, adicionar a versão em `apps/web/src/lib/changelog.ts`.

## Decisões que ficaram com você

- Manter ou não o `Dev:IsSupporter` (é só de Development; dá para apagar o `DevSupporterCurrentPlayer` sem afetar produção).
- ~~Onde hospedar o site~~: decidido, Azure Container Apps (ver acima).
- Preço final e preços por moeda (configurados na Stripe, não no código).
- Desde a 1.5.0 o treino também guarda os palpites no servidor (`PracticeSession.GuessedSlugs`), para liberar o contorno só dos impérios já chutados na rodada.

## O que fica para o agente de QA

- Testar no navegador, de ponta a ponta: login com Google de verdade, logout, excluir conta (some tudo, inclusive treino), e o jogo continuar funcionando sem conta.
- Segundo aparelho: logado em dois navegadores, jogar metade num e abrir o outro; o tabuleiro tem que vir com os mesmos palpites, pistas e mapa.
- Checkout sandbox da Paddle com webhook chegando (túnel), apoio ligando sem recarregar a página, reembolso desligando, e o diálogo nunca reabrindo o checkout para quem já é apoiador.
- Arquivo e treino: telas bloqueadas para não apoiador, todas as opções do treino, jogo passado não mexendo nas estatísticas.
- Treino só depois do jogo do dia (painel "Primeiro, o desafio de hoje"), e "Sair de todos os aparelhos" com dois navegadores logados.
- Layout em celular (menu com selo, diálogos de conta e apoio, páginas novas) e os dois idiomas.
- Conferir que nenhum texto visível tem travessão longo.
