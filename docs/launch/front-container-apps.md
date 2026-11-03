# Site (Next.js) no Azure Container Apps

Atualizado em 3 de novembro de 2026. Nada disto foi publicado: a imagem, o job de deploy e este passo a passo estão prontos, mas nada muda na Vercel nem no Azure até você seguir os passos abaixo e ligar a variável `AZURE_DEPLOY_WEB`.

**Por quê:** o plano Hobby da Vercel não permite uso comercial, e com a venda do Apoio o site passa a ser comercial. O Pro custa US$ 20 por mês. A ideia é rodar o site como um segundo Container App, no mesmo ambiente da API, e ficar dentro (ou bem perto) da cota grátis mensal.

## Resumo do que já está pronto no código

| Peça | Onde | O que faz |
|---|---|---|
| `output: "standalone"` | `apps/web/next.config.ts` | O build gera um servidor Node que se basta (`server.js` mais só os pacotes que ele usa). Na Vercel não muda nada. |
| `images: { unoptimized: true }` | `apps/web/next.config.ts` | O site não usa `next/image`. Desligado, o `/_next/image` não fica aberto para alguém fazer o servidor redimensionar imagens, e a imagem Docker não precisa do `sharp` (uns 19 MB). |
| `Dockerfile` e `.dockerignore` | `apps/web/` | Imagem de produção em três etapas, Node 24.22.2 (LTS) em Alpine 3.24 fixados, usuário sem root (`node`), porta 8080 igual à da API, `HEALTHCHECK`. |
| `GET /api/health` | `apps/web/src/app/api/health/route.ts` | Responde `{"status":"ok"}` sem chamar a API. Serve para as sondas (probes) do Container Apps e para o teste de fumaça. |
| Analytics só na Vercel | `apps/web/src/lib/analytics.ts` | O `<Analytics />` da Vercel só aparece quando o site roda na Vercel (`VERCEL=1`). No container não há analytics nenhum até você escolher um (ver "Analytics"). |
| Job "Deploy web to Azure" | `.github/workflows/ci-cd.yml` | Igual ao da API: imagem no GHCR, login OIDC, `az containerapp update`, espera a revisão ficar saudável, teste de fumaça em `/`, `/pt`, `/en` e `/api/health`. Só roda com `AZURE_DEPLOY_WEB = true`. |
| Dependabot da imagem | `.github/dependabot.yml` | Abre PR quando sair Node novo para a imagem do site. |

Medido localmente (Docker Desktop): imagem de **64 MB comprimida** (67.257.194 bytes, o que o registro guarda e o Azure baixa), **178 MB descomprimida** (o Node em si é a maior parte; o app ocupa 25 MB). O container sobe em menos de 1 segundo e usa uns **71 MiB de memória** servindo páginas.

### O que continua como hoje

- **Páginas de desenvolvimento.** `/dev/maps`, `/dev/generator`, `/api/geo/*` e `/api/dev/*` respondem 404 em produção, do mesmo jeito que na Vercel: elas conferem `NODE_ENV === "production"`, e a imagem roda com `NODE_ENV=production`. As páginas `/dev/*` já saem do build como 404 estático. O índice local do Cliopatria (`dev-data/`) fica fora da imagem, e os arquivos de conteúdo da API (`apps/api/Content`) nunca entram (estão fora da pasta do site).
- **Variáveis `NEXT_PUBLIC_*`.** Elas são escritas dentro do JavaScript no momento do build. Por isso, no container elas são **argumentos de build** (`--build-arg`), não variáveis de ambiente do Container App. Mudar uma = gerar imagem nova (basta rodar o workflow de novo).
- **Cabeçalhos e redirecionamentos.** O site não tem `headers()` nem `redirects()` próprios da Vercel. O redirecionamento de `/` para `/pt` ou `/en` é do `next-intl` (no `proxy.ts`) e funciona igual no container (testado, `Location: /en` relativo).

## O que era específico da Vercel

1. **`@vercel/analytics`**: só funciona na Vercel (carrega `/_vercel/insights/script.js`, que nenhum outro servidor tem). Agora só é renderizado na Vercel. O pacote continua instalado para a volta à Vercel funcionar sem mexer em código.
2. **Otimização de imagem**: a Vercel otimiza `next/image` na borda. O site não usa `next/image`, então foi só desligar.
3. **Deploy pelo Git da Vercel**: substituído pelo job novo do GitHub Actions.
4. **Variáveis do projeto na Vercel** (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PADDLE_*`, `NEXT_PUBLIC_SITE_URL`): passam a ser **variáveis do repositório** no GitHub (ver tabela abaixo).
5. **Texto da política de privacidade**: `apps/web/src/lib/legal.ts` cita "Vercel (hospedagem do site e contagem de visitas)" e "Vercel Web Analytics". Isso **não foi mudado**, porque enquanto o site estiver na Vercel o texto está certo. No dia da troca, mudar (pt e en) e atualizar a data no topo:
   - Item "Visitas às páginas, contadas pelo Vercel Web Analytics...": apagar (ou trocar pelo provedor novo, se escolher um).
   - "Vercel (hospedagem do site e contagem de visitas), Estados Unidos." vira: o item "Microsoft Azure (servidor do jogo)." passa a ser "Microsoft Azure (site e servidor do jogo)." e o item da Vercel sai.

## Analytics

No container não há contagem de visitas. Nenhum provedor foi escolhido de propósito: a decisão é sua. Opções:

| Opção | Custo | Cookies / banner | Observação |
|---|---|---|---|
| **Cloudflare Web Analytics** | Grátis | Sem cookies, sem banner | Precisa só de um `<script>` com um token. Não exige o DNS na Cloudflare. Bem simples, poucos relatórios. |
| **Umami** (Cloud ou auto-hospedado) | Cloud tem plano grátis com limite; auto-hospedado = mais um container e um banco | Sem cookies, sem banner | Código aberto. Dava para rodar no mesmo ambiente do Container Apps, mas aí é mais uma coisa para manter. |
| **Plausible** | Pago (a partir de uns US$ 9 por mês), ou auto-hospedado | Sem cookies, sem banner | O mais polido dos "sem cookies". |
| **Azure Application Insights** (SDK de navegador) | Cota grátis de ingestão no Log Analytics, depois por GB | **Usa cookies** (`ai_user`, `ai_session`) por padrão: pela LGPD/GDPR isso pede banner de consentimento, a não ser que você desligue os cookies na configuração do SDK | Bom para erros e desempenho (inclusive da API), pesado para só contar visitas. |

Para um jogo diário e simples, a recomendação mais leve é Cloudflare Web Analytics ou Umami: nenhum dos dois precisa de banner, e a política de privacidade continua dizendo "sem cookies e sem identificar você" (só troca o nome do provedor). Para ligar qualquer um, o lugar é o mesmo: `apps/web/src/lib/analytics.ts` e o `layout.tsx` (onde hoje fica o `<Analytics />`), com o token entrando como `NEXT_PUBLIC_*` (argumento de build).

## Custos

Preços do plano Consumo do Azure Container Apps (USD, região East US, tabela de preços pública do Azure em 3/11/2026; outras regiões podem variar um pouco):

| Item | Preço |
|---|---|
| vCPU ativa | US$ 0,000024 por vCPU-segundo |
| vCPU ociosa (idle) | US$ 0,000003 por vCPU-segundo |
| Memória (ativa ou ociosa) | US$ 0,000003 por GiB-segundo |
| Requisições | US$ 0,40 por milhão |

**Cota grátis por mês, por assinatura** (vale para a soma da API mais o site, não para cada app): 180.000 vCPU-segundos, 360.000 GiB-segundos e 2 milhões de requisições. Sondas de saúde não contam como requisição. Fontes:

- https://learn.microsoft.com/en-us/azure/container-apps/billing
- https://azure.microsoft.com/en-us/pricing/details/container-apps/
- https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20%27Azure%20Container%20Apps%27%20and%20armRegionName%20eq%20%27eastus%27

Como funciona o "ocioso": só existe quando a réplica mínima é maior que zero. A réplica conta como ociosa quando não está atendendo requisição, usa menos de 0,01 vCPU e recebe menos de 1.000 bytes por segundo. Com réplica mínima 0, não há cobrança nenhuma enquanto está em zero, e tudo o que roda é cobrado como ativo.

Conta para o site com **0,25 vCPU e 0,5 GiB** (sobra: ele usa uns 71 MiB). Um mês de 30 dias tem 2.592.000 segundos.

| Cenário do site | Uso no mês | Custo estimado só do site |
|---|---|---|
| **Mínimo 0**, umas 4 horas por dia com alguém jogando | 108.000 vCPU-s e 216.000 GiB-s | **US$ 0** se a API deixar espaço na cota; uns US$ 3 se a cota já tiver sido toda usada pela API |
| **Mínimo 1**, quase sempre ocioso, ~2 h ativas por dia | 648.000 vCPU-s e 1.296.000 GiB-s | **uns US$ 5 a 6** sem cota sobrando (US$ 1,9 de vCPU ociosa + US$ 3,9 de memória + ~US$ 1 da parte ativa); uns US$ 4 se a cota inteira sobrasse para o site |
| Mínimo 1, sempre ativo (muito tráfego o dia todo) | o mesmo, tudo ativo | uns US$ 19 |
| Requisições | um jogo diário pequeno fica bem abaixo de 2 milhões por mês | US$ 0 |

**Ponto honesto:** com mínimo 1, o site sozinho já passa da cota de vCPU (648 mil contra 180 mil grátis), então "ficar 100% no grátis" só acontece com **mínimo 0 nos dois apps** e pouco tráfego. Ainda assim, o pior caso realista (mínimo 1) fica em uns US$ 5 por mês, contra US$ 20 do Vercel Pro. Para saber quanto da cota a API já usa, veja o portal: Gerenciamento de Custos, ou rode:

```
az containerapp show -n imperatle-api -g rg-imperatle --query "{cpu:properties.template.containers[0].resources.cpu, mem:properties.template.containers[0].resources.memory, min:properties.template.scale.minReplicas, max:properties.template.scale.maxReplicas}"
```

Não fica de olho em custo sem querer: crie um alerta de orçamento (Gerenciamento de Custos > Orçamentos) de, por exemplo, US$ 5 por mês.

## Partida a frio (cold start)

Com mínimo 0, depois de alguns minutos sem visitas (o padrão é 300 segundos) a réplica é desligada. A próxima visita espera o Azure ligar uma réplica nova: baixar a imagem (se a máquina não tiver em cache), subir o container e responder. O Next em si sobe em menos de 1 segundo; o que pesa é a parte do Azure, normalmente alguns segundos.

O problema de **os dois em zero**: a página inicial é montada no servidor e, para isso, o site chama `GET /challenges/today` na API. Então a primeira visita depois de um tempo parado paga **duas** partidas a frio em fila: liga o site, o site chama a API, liga a API (que é .NET e, na subida, ainda roda migration e importa o conteúdo). Pode passar de 10 segundos.

Opções, da mais barata para a mais cara:

1. **Aceitar no começo.** Com pouco tráfego, poucas pessoas pegam a espera; o teste de fumaça do deploy já tenta de novo por causa disso.
2. **Mínimo 1 só no site** (uns US$ 5 por mês): a página abre na hora, e a espera fica só na chamada à API. Como o layout trata erro da API (mostra a página sem o número do desafio), nada quebra.
3. **Mínimo 1 só na API**: a API fica quente (é ela que tem a subida mais lenta), e o site liga rápido. Custo parecido, um pouco maior se a API tiver mais CPU/memória.
4. **Mínimo 1 nos dois**: sem espera nenhuma; algo entre US$ 10 e US$ 20 por mês, dependendo do tamanho da API.

**Não vale** ficar "pingando" o site a cada poucos minutos para não desligar: com mínimo 0 a réplica fica ligada e cobrada como **ativa** o tempo todo (uns US$ 19 por mês no site), mais caro que o mínimo 1 ocioso. Se quiser ajustar, `--scale-rule-http-concurrency` e o tempo de espera antes de desligar (`cooldownPeriod` na seção de escala) também existem, mas o efeito no custo é pequeno.

Sugestão para o lançamento: **site com mínimo 1 e API como está hoje**. Dá para mudar a qualquer momento sem deploy:

```
az containerapp update -n imperatle-web -g rg-imperatle --min-replicas 0
```

## Passo a passo

Os comandos abaixo são para o PowerShell com o Azure CLI logado (`az login`). Troque o que estiver entre `<>`. Os nomes `rg-imperatle` e `imperatle-api` são os que o workflow já usa.

### 0. Antes de começar

- Anote (print) **todos os registros DNS atuais** de `imperatle.com` e `www.imperatle.com`. É isso que você volta se precisar desfazer.
- Um dia antes, baixe o TTL desses registros para 300 segundos (5 minutos). Assim a troca e uma eventual volta se espalham rápido.
- Não desconecte a Vercel ainda. Ela fica no ar até o fim, como plano B.

### 1. Descobrir o ambiente da API

```
$RG = "rg-imperatle"
$ENVID = az containerapp show -n imperatle-api -g $RG --query properties.managedEnvironmentId -o tsv
$ENVNAME = ($ENVID -split "/")[-1]
$ENVNAME
```

### 2. Criar o Container App do site

Ele nasce com uma imagem de exemplo da Microsoft (na porta 80). O primeiro deploy do GitHub Actions troca a porta para 8080 e a imagem para a do site, igual faz com a API.

```
az containerapp create `
  -n imperatle-web -g $RG --environment $ENVNAME `
  --image mcr.microsoft.com/k8se/quickstart:latest `
  --ingress external --target-port 80 `
  --cpu 0.25 --memory 0.5Gi `
  --min-replicas 1 --max-replicas 2
```

- `--ingress external`: aberto para a internet, HTTPS feito pelo Azure (HTTP é redirecionado).
- `--min-replicas 1` ou `0`: ver "Custos" e "Partida a frio". `--max-replicas 2` evita que um pico (ou um ataque) multiplique a conta.
- Nenhuma variável de ambiente é necessária em tempo de execução: tudo o que o site precisa entra no build.

### 3. Deixar o Azure baixar a imagem do GHCR

Veja como a API faz hoje:

```
az containerapp registry list -n imperatle-api -g $RG -o table
```

- **Se aparecer `ghcr.io` com usuário e senha** (um token do GitHub): configure o mesmo no site. O token precisa do escopo `read:packages`.
  ```
  az containerapp registry set -n imperatle-web -g $RG --server ghcr.io --username <SEU_USUARIO_GITHUB> --password <TOKEN_COM_READ_PACKAGES>
  ```
- **Se não aparecer nada** (o pacote `imperatle-api` é público): o pacote `imperatle-web` nasce **privado** no primeiro push. O primeiro deploy vai falhar no passo "Wait for the new revision" porque o Azure não consegue baixar. Aí: GitHub > seu perfil > Packages > `imperatle-web` > Package settings > Change visibility > Public, e rode o workflow de novo (Actions > CI/CD > Run workflow). A imagem não tem segredo nenhum (só os `NEXT_PUBLIC_*`, que já são públicos no navegador).

### 4. Variáveis no GitHub

Em Settings > Secrets and variables > Actions > **Variables** (não "Secrets": são valores públicos):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | o client-side token da Paddle (`test_...` no sandbox) |
| `NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID` | o `pri_...` do Apoio |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | `sandbox` (ou `production`) |
| `AZURE_DEPLOY_WEB` | `true` (só no fim deste passo; é a chave que liga o job) |

`NEXT_PUBLIC_API_URL` (`https://api.imperatle.com`) e `NEXT_PUBLIC_SITE_URL` (`https://imperatle.com`) já estão fixos no workflow (`API_URL` e `WEB_URL`). Os segredos `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID` são os mesmos da API. A identidade usada pelo OIDC precisa poder atualizar o app novo: se ela tem papel de Colaborador (Contributor) no grupo `rg-imperatle`, já pode; se o papel foi dado só no `imperatle-api`, dê também no `imperatle-web`:

```
$APPID = "<AZURE_CLIENT_ID>"
$WEBID = az containerapp show -n imperatle-web -g $RG --query id -o tsv
az role assignment create --assignee $APPID --role Contributor --scope $WEBID
```

Mude `AZURE_DEPLOY_WEB` para `true` e rode o workflow (Actions > CI/CD > Run workflow, branch `main`). O teste de fumaça usa `https://imperatle.com`, que ainda aponta para a Vercel neste momento: ele passa (testa a Vercel), mas o que importa aqui é o passo "Wait for the new revision to be healthy" ficar verde. Para ver o site novo antes do domínio:

```
az containerapp show -n imperatle-web -g $RG --query properties.configuration.ingress.fqdn -o tsv
```

Abra `https://<esse-endereco>/pt` e `/en`. O jogo carrega, mas **login e compra não funcionam nesse endereço** (o cookie de login é de `imperatle.com` e o CORS da API só aceita `imperatle.com`). Isso é esperado; eles voltam a funcionar quando o domínio apontar para cá.

### 5. Sondas de saúde (opcional, recomendado)

Sem configurar, o Azure só confere se a porta 8080 aceita conexão. Para ele conferir se o servidor responde de verdade, use a rota `/api/health`. Salve como `web-probes.yaml`:

```yaml
properties:
  template:
    containers:
      - name: imperatle-web
        probes:
          - type: Liveness
            httpGet: { path: /api/health, port: 8080 }
            periodSeconds: 30
            failureThreshold: 3
          - type: Readiness
            httpGet: { path: /api/health, port: 8080 }
            periodSeconds: 10
            failureThreshold: 3
          - type: Startup
            httpGet: { path: /api/health, port: 8080 }
            periodSeconds: 2
            failureThreshold: 15
```

```
az containerapp show -n imperatle-web -g $RG --query "properties.template.containers[0].name" -o tsv   # confira o nome do container
az containerapp update -n imperatle-web -g $RG --yaml web-probes.yaml
```

Se o nome do container não for `imperatle-web`, troque no YAML. Faça isso **depois** do primeiro deploy (com a imagem de exemplo, `/api/health` não existe).

### 6. Domínio `imperatle.com` e certificado grátis

Pegue os valores:

```
az containerapp env show -n $ENVNAME -g $RG --query properties.staticIp -o tsv                     # IP do ambiente (para o domínio raiz)
az containerapp show -n imperatle-web -g $RG --query properties.customDomainVerificationId -o tsv   # código de verificação
az containerapp show -n imperatle-web -g $RG --query properties.configuration.ingress.fqdn -o tsv   # endereço gerado (para o www)
```

No seu provedor de DNS, **troque** os registros da Vercel por estes:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` (imperatle.com) | o `staticIp` do ambiente |
| TXT | `asuid` | o código de verificação |
| CNAME | `www` | o endereço gerado (`imperatle-web.<algo>.azurecontainerapps.io`) |
| TXT | `asuid.www` | o mesmo código de verificação |

Cuidados com o domínio raiz (apex):

- Domínio raiz não pode ter CNAME pelo padrão do DNS; por isso o Azure pede **A + TXT** e valida o certificado por **HTTP** (a DigiCert acessa o site). Apague os registros A/AAAA antigos da Vercel do `@` (por exemplo `76.76.21.21`), senão parte das visitas continua indo para lá. Se houver registro **AAAA** no `@`, apague: o Container Apps não tem IPv6 de entrada.
- O registro `api` (da API) **não muda**.
- **Se o DNS estiver na Cloudflare**: os quatro registros acima ficam **"DNS only" (nuvem cinza)**, não "Proxied" (laranja). Com o proxy ligado, a validação do certificado e a renovação automática falham (a Microsoft diz que CNAME intermediário de Cloudflare bloqueia a emissão). O "CNAME flattening" da Cloudflare deixaria pôr um CNAME no `@` apontando para o endereço gerado, mas a Microsoft exige o A para o domínio raiz; use o A. Proxy da Cloudflare na frente só depois, com certificado próprio (é outro projeto).
- **Se existir registro CAA** no domínio, adicione `0 issue "digicert.com"`, senão o certificado não sai.
- Para emitir (e renovar) o certificado, o app precisa estar ligado e acessível. Com mínimo 0 funciona (a visita da DigiCert acorda o app), mas se der tempo esgotado, ponha mínimo 1 durante a emissão.

Depois que o DNS propagar (confira com `nslookup imperatle.com` e `nslookup -type=TXT asuid.imperatle.com`):

```
az containerapp hostname add  --hostname imperatle.com -g $RG -n imperatle-web
az containerapp hostname bind --hostname imperatle.com -g $RG -n imperatle-web --environment $ENVNAME --validation-method HTTP

az containerapp hostname add  --hostname www.imperatle.com -g $RG -n imperatle-web
az containerapp hostname bind --hostname www.imperatle.com -g $RG -n imperatle-web --environment $ENVNAME --validation-method CNAME

az containerapp hostname list -g $RG -n imperatle-web -o table
```

Pode levar alguns minutos. Pronto quando os dois aparecem com o certificado ligado (no portal: "Secured").

Diferença para a Vercel: lá o `www` provavelmente redireciona para `imperatle.com`. Aqui os dois endereços mostram o site (as tags canonical e hreflang já apontam para `imperatle.com`, então o Google entende). O CORS da API já aceita os dois. Se quiser o redirecionamento, dá para adicionar depois no `proxy.ts`.

### 7. Conferir

- `https://imperatle.com/pt` e `/en` abrem, com o cadeado.
- Login com Google, logout, compra no sandbox (o cookie de login volta a funcionar porque o site está de novo em `imperatle.com`).
- Rode o workflow uma vez mais: o teste de fumaça agora testa o Azure de verdade.
- Atualize o texto da política de privacidade (ver "O que era específico da Vercel", item 5) e a versão em `apps/web/src/lib/changelog.ts`.

### 8. Desligar a Vercel

Só depois de uns dias tudo bem:

- Vercel > projeto > Settings > Git > **Disconnect** (para de fazer deploy a cada push).
- Settings > Domains: remova `imperatle.com` e `www.imperatle.com` do projeto.
- Pode manter o projeto parado (não custa nada) para uma volta rápida, ou apagar.
- No README, a linha "Hosting" passa a dizer "Azure Container Apps (web and API)". O comentário do topo do `ci-cd.yml` também.

## Como voltar para a Vercel se algo quebrar

Enquanto a Vercel não for desconectada, ela continua fazendo deploy de cada push, então está sempre atualizada.

1. No DNS, volte os registros que você anotou no passo 0 (o A do `@` e o CNAME do `www` da Vercel). Com TTL de 5 minutos, em poucos minutos o tráfego volta.
2. Os TXT `asuid` podem ficar (não atrapalham).
3. Mude `AZURE_DEPLOY_WEB` para `false` se não quiser mais deploys no Azure.
4. Nada no código precisa mudar: na Vercel o analytics volta sozinho (`VERCEL=1`), e o `output: "standalone"` é ignorado por ela.
5. Para parar de pagar o app do Azure sem apagar: `az containerapp update -n imperatle-web -g $RG --min-replicas 0`. Para apagar: `az containerapp delete -n imperatle-web -g $RG`.

Se o problema for só uma versão nova do site, não precisa sair do Azure: volte para a revisão anterior.

```
az containerapp revision list -n imperatle-web -g $RG -o table
az containerapp ingress traffic set -n imperatle-web -g $RG --revision-weight <REVISAO_ANTERIOR>=100
```

(Isso só funciona com o modo de várias revisões; no modo de uma revisão, que é o padrão, rode o workflow de novo num commit anterior, ou `az containerapp update -n imperatle-web -g $RG --image ghcr.io/afcventura/imperatle-web:<HASH_DO_COMMIT_BOM>`.)

## Testar a imagem no seu computador

Na pasta `apps/web`, com a API rodando em `http://localhost:5055`:

```
docker build -t imperatle-web --build-arg NEXT_PUBLIC_API_URL=http://host.docker.internal:5055 .
docker run --rm -p 8088:8080 imperatle-web
```

Abra `http://localhost:8088/pt`. (Para a API aceitar conexões vindas do Docker, rode-a ouvindo em todas as interfaces: `$env:ASPNETCORE_URLS = "http://0.0.0.0:5055"`. O navegador não resolve `host.docker.internal`, então partes que o navegador busca direto na API não carregam nesse teste; as páginas montadas no servidor, sim.)

## Para depois: Cloudflare Workers

Testado num diretório temporário fora do repositório (nada disso foi commitado): `@opennextjs/cloudflare` 1.20.15 com `wrangler` 4.157.0 compila o site sem mudar código.

- Tamanho do worker: **7.648 KiB sem compressão, 1.654 KiB (1,6 MiB) com gzip**, medido com `wrangler deploy --dry-run`.
- Limites do Workers: **3 MiB no plano grátis, 10 MiB no pago** (US$ 5 por mês), contando o tamanho comprimido. Cabe no grátis, com folga de uns 1,3 MiB.
- Rodou localmente no `wrangler dev`: `/` redireciona, `/pt`, `/en` e `/api/health` respondem 200.
- Avisos: o `proxy.ts` (middleware em Node.js) roda, mas o OpenNext avisa que esse suporte é experimental na Cloudflare. As rotas de desenvolvimento (`/api/geo/*`, que puxam turf e polygon-clipping) entram no worker mesmo respondendo 404; tirá-las do build de produção deixaria o worker menor.
- O plano grátis do Workers permite uso comercial, mas tem limite de 100 mil requisições por dia e 10 ms de CPU por requisição (renderizar a página do jogo pode passar disso; o pago dá 30 s). Seria a opção mais barata se o site crescer, mas é uma migração própria.
