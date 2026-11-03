# Relatório de QA e segurança do lançamento

Branch `feat/launch-qa` (saiu da `feat/launch`), 3 de novembro de 2026. Nada foi enviado (push), publicado (deploy) nem juntado ao `main`.

## Resumo

- A superfície nova está bem feita no geral: login sem open redirect, logout e exclusão protegidos contra CSRF, webhook da Paddle com assinatura, janela de tempo, idempotência e checagem do preço, checagem de apoiador no servidor em todos os 8 endpoints de arquivo e treino, e a resposta nunca sai antes do fim da rodada.
- Achei **1 problema médio que já corrigi** (limites por IP viravam globais em produção), **1 médio que é decisão sua** (dá para descobrir a resposta do dia pelo treino, por eliminação) e alguns baixos. Os que eram bug claro estão corrigidos, cada um no seu commit e com teste.
- Todos os testes passam: 205 testes da API, 84 do site, lint, typecheck, build e os 34 testes de ponta a ponta (Playwright).

## Achados, do mais grave ao menos grave

### Médio

**M1. Limites por IP valiam para todo mundo junto em produção.** Corrigido em `3b94660`.
- Onde: `apps/api/Program.cs` (configuração de `ForwardedHeadersOptions`, agora em `apps/api/Auth/ProxyHeaders.cs`).
- O que era: o commit de contas configurou os cabeçalhos do proxy só com `X-Forwarded-Proto`. Isso passa por cima do `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` do Dockerfile. Atrás da entrada do Azure Container Apps, todo pedido parece vir do mesmo IP (o da entrada).
- Impacto: o limite do feedback (5 mensagens a cada 10 minutos por IP) virava 5 mensagens a cada 10 minutos **para o site inteiro**. O limite de palpites também cai no IP no primeiro palpite de cada visitante (antes do cookie existir): 20 primeiros palpites por minuto para todos juntos, ou seja, erro 429 para jogadores de verdade num pico.
- Correção: lê de novo o IP do cliente pelo `X-Forwarded-For`, só o último salto (o que a própria entrada do Azure acrescenta), então ninguém escolhe o próprio IP mandando o cabeçalho. Testes em `ProxyHeadersTests`.

**M2. Um apoiador consegue descobrir a resposta do dia pelo modo treino, por eliminação.** Não corrigido: decisão sua.
- Onde: `apps/api/Controllers/PracticeController.cs` (`Start` tira o império do dia do sorteio).
- O que é: o treino nunca sorteia o império do dia (o que é certo: senão ele apareceria direto). Mas a contagem do filtro mostra quantos impérios ele tem, e o sorteio evita repetir os 10 últimos. Com um filtro pequeno (por exemplo Fácil + Ásia, ou Médio + Idade Média + Ásia), o apoiador joga rodadas até ver todos os impérios do filtro; o que nunca aparece é o do dia. Com 2 impérios no filtro, se um deles é o do dia, "Jogar de novo" traz sempre o mesmo. Custa algumas rodadas (cada uma com 3 tentativas para revelar o nome).
- Impacto: só apoiadores, só estraga o jogo de quem quer trapacear, e não mexe no placar de ninguém. Mas o "Imperatle de hoje" pode aparecer em fórum antes da hora.
- Opções:
  1. **Recomendo:** o treino só abre depois que a pessoa terminou o jogo do dia (o servidor confere; a tela de treino diz "termine o desafio de hoje primeiro"). Fecha o vazamento sem mudar mais nada.
  2. Aceitar como está (é trabalhoso e só para apoiador).
  3. Deixar o império do dia entrar no sorteio: pior, porque aí ele aparece direto no treino.

### Baixo

**B1. Trocar de conta no mesmo navegador sem sair dava erro 500 no palpite.** Corrigido em `11128fb`.
- Onde: `apps/api/Controllers/AuthController.cs` (`GoogleComplete`) e `AccountService.BrowserHasOtherAccountAsync`.
- O que era: o cookie anônimo (`imperatle_aid`) só é trocado no logout. Se o login da conta A expira (180 dias sem uso) ou o cookie de login some sem logout, e a conta B entra nesse navegador, as duas ficam com o mesmo id anônimo. No primeiro dia em que as duas jogam, o banco recusa a segunda linha (índice único por navegador e dia) e o palpite volta 500.
- Correção: no login, se o navegador ainda tem jogos de outra conta, ele ganha um id anônimo novo.

**B2. O tabuleiro da conta ficava salvo no navegador depois de sair ou excluir a conta.** Corrigido em `d02329a`.
- Onde: `apps/web/src/lib/me.ts` (`logout`, `deleteAccount`).
- O que era: num computador compartilhado, a próxima pessoa via o jogo do dia da conta anterior por um instante (até o servidor responder com a rodada vazia), e para sempre se a API estivesse fora. O mesmo para a rodada de treino em andamento.
- Correção: logout e exclusão apagam as cópias locais dos jogos (as opções do treino, que são preferência, ficam).

**B3. O treino tinha dois nomes em português.** Corrigido em `dd7918c`.
- Menu, página e painel bloqueado diziam "Treino"; o diálogo de apoio e os termos diziam "modo prática". Agora é "modo treino" em todo lugar. O teste novo também garante que nenhuma mensagem tem travessão longo.

**B4. Palpites mandados ao mesmo tempo passam do limite de tentativas.** Não corrigido.
- Onde: os três `Guess` (`ChallengesController`, `ArchiveController`, `PracticeController`).
- O que é: conferi na API local: 12 palpites disparados juntos com o mesmo cookie, 10 aceitos, e o contador foi de 1 para 7. Cada pedido lê o contador, soma 1 e grava; os simultâneos se sobrescrevem. Quem faz isso ganha mais comparações (maior/menor) do que as 7 tentativas.
- Impacto: baixo. Um jogador anônimo já pode recomeçar com outro cookie quando quiser. Para quem tem conta, dá para inflar acertos e sequência nas estatísticas. O limite de 20 palpites por minuto segura um pouco.
- Correção sugerida: token de concorrência na linha (`xmin` do Postgres via EF Core) e repetir o palpite em caso de conflito. Mexe no modelo e na migration, por isso deixei para a integração decidir.

**B5. Duas cópias da API subindo juntas num banco vazio quebraram a migration.** Não corrigido.
- Onde: `apps/api/Program.cs` (o comentário diz que o EF Core trava o banco durante a migration).
- O que vi: subindo duas APIs ao mesmo tempo num banco novo, uma falhou com `column "AreaPrecision" of relation "Empires" already exists`. A suíte e2e agora sobe uma de cada vez.
- Impacto em produção: só se duas réplicas subirem juntas com migration pendente. Recomendo, no deploy do lançamento, manter 1 réplica (ou rodar a migration à mão com `Database__MigrateOnStartup=false`) e fazer o backup do Neon antes, como já está no STATUS.

**B6. O limite de palpites é por cookie, e o cookie é do cliente.** Não corrigido (informativo).
- Mandando um `imperatle_aid` novo em cada pedido, o limite não pega. É da natureza do jogo sem conta (o jogador também pode recomeçar a rodada assim). Só vale saber que o limite segura uso normal, não um robô.

### Informativos

- **I1. Logout não invalida o cookie no servidor.** O cookie de login é autossuficiente (vale 180 dias). Se alguém copiar o cookie, ele continua valendo depois do logout, até a conta ser excluída. Normal para esse porte; se quiser fechar, dá para guardar um "carimbo de segurança" no `User` e trocar no logout.
- **I2. Compra dupla.** O diálogo não deixa quem já apoia comprar de novo, mas se acontecer (duas abas), só a primeira transação fica registrada. Reembolsar a primeira tira o apoio mesmo com a segunda paga. Raro; no caso, reembolse a segunda.
- **I3. Sessão expirada no mesmo navegador.** Se o login expira sem logout, quem joga deslogado naquele navegador continua jogando nas linhas da conta (mesmo id anônimo). Raro e só no próprio navegador da pessoa.
- **I4. Chaves de proteção de dados no banco.** As chaves que assinam o cookie de login ficam na tabela `DataProtectionKeys`. Quem tiver acesso ao banco consegue forjar login. Guardar a connection string como secret (já é).
- **I5. `custom_data.userId` vem do navegador.** Alguém pode pagar o apoio "para outra conta" (vira um presente). Inofensivo.
- **I6. Logs.** Nenhum log com token ou e-mail. O webhook registra id do usuário e da transação. O EF Core loga o SQL em nível Information, sem os valores dos parâmetros.
- **I7. Dependências.** `dotnet list package --vulnerable`: nenhum pacote vulnerável (API e testes). `npm audit --omit=dev`: 0 vulnerabilidades em produção. Com as de desenvolvimento: 19 (18 moderadas, 1 alta em `zod`, que só vem do `eslint-plugin-react-hooks`); nenhuma vai para o site publicado.

## O que foi revisado e está certo

- **Open redirect no login:** só aceita URL absoluta http(s) de uma das origens permitidas; testei `https://evil.com`, `localhost:3004@evil.com`, `localhost:3004.evil.com`, `//evil.com`, barra invertida e `javascript:` (todos 400). Também coberto pelo e2e.
- **Cookies:** `imperatle_session` HttpOnly, SameSite=Lax, Secure fora de Development, domínio só com `Auth:CookieDomain`; cookie externo e de correlação do Google curtos e só no host da API. Tokens do Google não são guardados.
- **CSRF:** `POST /auth/logout` e `DELETE /me` exigem `Origin` de uma origem permitida (sem `Origin` ou de outro site: 403), além do SameSite=Lax.
- **Fixação de sessão:** o login sempre cria um cookie novo; o id anônimo agora também é trocado quando o navegador tinha jogos de outra conta (B1).
- **Dono dos dados (`AccountService.ProgressOf`):** nenhuma rota recebe id de jogador; tudo sai dos cookies. Rodada de treino de outra pessoa responde 404 (mesmo com o id certo, testado no e2e). Datas do arquivo só leem e gravam as linhas do próprio jogador.
- **Webhook da Paddle:** assinatura HMAC com comparação em tempo constante, janela de 5 minutos, eventos repetidos ignorados pelo id (inclusive dois ao mesmo tempo), só libera com o preço do Apoiador, só revoga com reembolso total aprovado ou chargeback, corpo limitado a 256 KB, segredo vazio recusa tudo.
- **Checagem de apoiador:** `GET /archive`, `GET /archive/{data}`, `POST /archive/{data}/guess`, `GET /practice/pool`, `POST /practice`, `GET /practice/{id}`, `GET /practice/{id}/map`, `POST /practice/{id}/guess`: todos 403 para quem não apoia (e2e).
- **Segredo da resposta:** `/challenges/today` e `/challenges/today/progress` nunca trazem a resposta no meio da rodada; mapa de data futura é 404; arquivo recusa hoje e o futuro; treino não devolve o império até o fim; com dicas desligadas o treino não manda dica nenhuma. A única brecha é a eliminação do M2.
- **`Dev:IsSupporter`:** só é registrado com `IsDevelopment()`; os botões DEV respondem 404 fora de Development.
- **Segredos no repositório:** nenhum (procurei chaves do Google, Paddle e Resend no código e no histórico da branch).

## Testes de ponta a ponta

Rodar: `cd apps/web && npm run e2e` (fica fora do `npm test`). Precisa do Docker com o `imperatle-postgres-1` de pé e das portas 5104, 5105 e 3004 livres. O script cria o banco `imperatle_qa` se não existir (recusa `imperatle`, `imperatle_dev` e `imperatle_launch`), publica a API em `apps/web/e2e/.api`, sobe duas cópias dela (5104 normal; 5105 com `Dev:IsSupporter`), faz o build de produção do site na 3004 e grava 3 dias passados no arquivo.

O que cobre (34 testes, Chromium):

- **Jogo do dia sem conta:** vitória do começo ao fim; derrota em 7 tentativas com a resposta só no fim; recarregar mantém o tabuleiro; segundo "aparelho" (outro navegador com o mesmo cookie e sem nada salvo) reconstrói o tabuleiro com os palpites reais e termina a rodada que o primeiro vê; o progresso do dia nunca traz a resposta.
- **Quem não apoia:** selo "Apoiadores" no menu, painel bloqueado em `/archive` e `/practice` com o botão abrindo o diálogo de apoio, e 403 nos 8 endpoints.
- **Apoiador:** dia do arquivo jogável (erro, acerto, aviso de "jogo anterior" no fim, "Won, 2/7" na lista, jogo de hoje intacto); arquivo recusa hoje e o futuro; treino com 3 tentativas, sem dicas e só contorno, depois "Jogar de novo" com as mesmas opções; treino com dicas e mapa completo, retomado depois de recarregar; 45 rodadas num filtro que contém o império do dia sem ele aparecer (comparando o mapa); rodada de outra pessoa é 404.
- **Idiomas:** troca pt/en em `/archive` e `/practice`, diálogo em português.
- **Conta e apoio (com `/me` simulado na rede):** deslogado (botão do Google, apoio pede login), login sem Google configurado volta com a mensagem de erro, login recusa outros sites, logout e exclusão recusam outra origem, logado (nome, e-mail, sair, excluir, sem aviso de apoiador), logado sem apoio (botão de compra, Paddle bloqueada mostra o erro do checkout em vez de travar), apoiador (sem selo, sem checkout, selo "Apoiador" na conta, aviso de perder o apoio ao excluir).
- **Celular, 390 px:** sem rolagem horizontal em início, menu, arquivo (bloqueado, lista, dia), treino (bloqueado, opções, rodada) e nos diálogos de conta e apoio, nos dois idiomas.

O que **não** dá para cobrir aqui e fica para você testar com as contas de verdade: login real com Google, checkout sandbox da Paddle com o webhook chegando (túnel), reembolso desligando o apoio, logout e exclusão de conta pelo navegador com sessão real (a lógica tem testes na API), Safari e Firefox, tema escuro.

## Capturas de tela

Em `docs/launch/qa-screens/`, celular de 390 px, em inglês (`en-`) e português (`pt-`):

- `home`: jogo do dia
- `menu-locked`: menu com o selo "Apoiadores"
- `archive-locked`, `practice-locked`: painéis bloqueados
- `archive-list`, `archive-day`: arquivo como apoiador
- `practice-setup`, `practice-round`: treino como apoiador
- `account-signed-out`, `account-signed-in`: diálogo da conta
- `support-signed-out`, `support-buy`, `support-supporter`: diálogo de apoio nos três estados

Observação: nas capturas o número do desafio do dia aparece como #4 porque o banco de teste só tem 3 dias passados.

## Checklist para lançar

Pronto do lado do código:

- [x] Testes da API, do site e e2e passando
- [x] Sem dependência vulnerável em produção
- [x] Sem segredo no repositório
- [x] Correções M1, B1, B2, B3 nesta branch (juntar na `feat/launch`)

Antes de ligar:

- [ ] Decidir o M2 (treino só depois do jogo do dia, ou aceitar)
- [ ] Decidir se o B4 (palpites simultâneos) entra agora ou depois
- [ ] Google OAuth configurado e um login real testado em produção (ou num ambiente igual)
- [ ] Paddle sandbox: compra, webhook chegando, apoio ligando sem recarregar, reembolso desligando
- [ ] Variáveis no Azure e na Vercel (lista no `STATUS.md`), com `Auth__CookieDomain=imperatle.com` e a API em `api.imperatle.com`
- [ ] Backup do Neon e deploy com 1 réplica enquanto a migration roda (B5)
- [ ] Hospedagem do site resolvida (Vercel Hobby não permite uso comercial)
- [ ] Revisão jurídica de privacidade, termos e reembolso
- [ ] Revisar as faixas de dificuldade do treino (`apps/api/Content/practice-difficulty.json`)
- [ ] Teste rápido no celular de verdade (Safari no iPhone e Chrome no Android): login, jogo, arquivo, treino
- [ ] Versão nova em `apps/web/src/lib/changelog.ts`

Com os itens acima feitos, **pode lançar**. Nenhum achado aberto impede o lançamento; o M2 é o único que eu resolveria antes, porque é barato.
