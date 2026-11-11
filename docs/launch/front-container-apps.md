# Site (Next.js) no Azure Container Apps

Atualizado em 4 de novembro de 2026. O código está pronto (branch `feat/front-azure`): imagem Docker, job de deploy, analytics da Cloudflare e textos legais já falando em Azure. **Nada foi publicado**: nada muda na Vercel nem no Azure até alguém seguir o checklist abaixo e ligar a variável `AZURE_DEPLOY_WEB`.

**Por quê:** o plano Hobby da Vercel não permite uso comercial, e com a venda do Apoio pela Paddle o site passa a ser comercial. O Pro custa US$ 20 por mês. O site vai rodar como um segundo Container App, no mesmo ambiente da API, com réplica mínima 1 (uns US$ 5 por mês, ver "Custos").

## Resumo do que já está pronto no código

| Peça | Onde | O que faz |
|---|---|---|
| `output: "standalone"` | `apps/web/next.config.ts` | O build gera um servidor Node que se basta (`server.js` mais só os pacotes que ele usa). Na Vercel não muda nada. |
| `images: { unoptimized: true }` | `apps/web/next.config.ts` | O site não usa `next/image`. Desligado, o `/_next/image` não fica aberto para alguém fazer o servidor redimensionar imagens, e a imagem Docker não precisa do `sharp` (uns 19 MB). |
| `Dockerfile` e `.dockerignore` | `apps/web/` | Imagem de produção em três etapas, Node 24.22.2 (LTS) em Alpine 3.24 fixados, usuário sem root (`node`), porta 8080 igual à da API, `HEALTHCHECK`. |
| `GET /api/health` | `apps/web/src/app/api/health/route.ts` | Responde `{"status":"ok"}` sem chamar a API. Serve para as sondas (probes) do Container Apps e para o teste de fumaça. |
| Cloudflare Web Analytics | `apps/web/src/lib/analytics.ts` e `layout.tsx` | Script da Cloudflare (sem cookies) só quando `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` existe no build. Sem o token, nada é renderizado (desenvolvimento local, CI). O `@vercel/analytics` foi removido. |
| Textos legais | `apps/web/src/lib/legal.ts` | Privacidade: Azure hospeda o site e o servidor do jogo, Cloudflare conta as visitas sem cookies, Vercel não aparece mais. Contato `contato@imperatle.com` em privacidade, termos e reembolso. Datas em 4/11/2026. |
| Job "Deploy web to Azure" | `.github/workflows/ci-cd.yml` | Igual ao da API: imagem no GHCR, login OIDC, `az containerapp update`, espera a revisão ficar saudável, teste de fumaça em `/`, `/pt`, `/en` e `/api/health`, primeiro no endereço próprio do Container App e depois no domínio (com aviso se o domínio ainda estiver na Vercel). Só roda com `AZURE_DEPLOY_WEB = true`. |
| Dependabot da imagem | `.github/dependabot.yml` | Abre PR quando sair Node novo para a imagem do site. |

Medido localmente (Docker Desktop): imagem de **64 MB comprimida** (o que o registro guarda e o Azure baixa), **178 MB descomprimida**. O container sobe em menos de 1 segundo e usa uns **71 MiB de memória** servindo páginas.

### O que continua como hoje

- **Páginas de desenvolvimento.** `/dev/maps`, `/dev/generator`, `/api/geo/*` e `/api/dev/*` respondem 404 em produção: elas conferem `NODE_ENV === "production"`, e a imagem roda com `NODE_ENV=production`. O índice local do Cliopatria (`dev-data/`) fica fora da imagem, e os arquivos de conteúdo da API (`apps/api/Content`) nunca entram.
- **Variáveis `NEXT_PUBLIC_*`.** Elas são escritas dentro do JavaScript no momento do build. Por isso, no container elas são **argumentos de build** (`--build-arg`), não variáveis de ambiente do Container App. Mudar uma = gerar imagem nova (basta rodar o workflow de novo).
- **Cabeçalhos e redirecionamentos.** O site não tem `headers()` nem `redirects()` próprios, nem Content-Security-Policy. O redirecionamento de `/` para `/pt` ou `/en` é do `next-intl` (no `proxy.ts`) e funciona igual no container. Se um dia entrar uma CSP, ela precisa liberar `script-src https://static.cloudflareinsights.com` e `connect-src https://cloudflareinsights.com` (para onde o script manda as visitas), além do que a Paddle pede.

## O que era específico da Vercel

1. **`@vercel/analytics`**: removido, trocado pelo Cloudflare Web Analytics (funciona em qualquer servidor).
2. **Otimização de imagem**: a Vercel otimiza `next/image` na borda. O site não usa `next/image`, então foi só desligar.
3. **Deploy pelo Git da Vercel**: substituído pelo job "Deploy web to Azure" do GitHub Actions.
4. **Variáveis do projeto na Vercel** (`NEXT_PUBLIC_PADDLE_*` e, se quiser, a do analytics): passam a ser **variáveis do repositório** no GitHub (ver o passo 6 do checklist). `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_SITE_URL` já estão fixos no workflow.
5. **Texto da política de privacidade**: já atualizado nesta branch (ver tabela acima).

Ficaram de propósito (não atrapalham e ajudam numa volta para a Vercel): `_vercel` na lista de exclusões do `matcher` do `proxy.ts` (é o padrão do `next-intl`; fora da Vercel nenhuma rota começa assim) e `.vercel` no `.gitignore` e no `.dockerignore` (pasta local do CLI da Vercel). Não existe `vercel.json` no repositório.

**Atenção ao mesclar no `main`:** enquanto a Vercel estiver ligada ao Git, ela publica o `main` de novo. A partir do merge desta branch, o site na Vercel fica sem contagem de visitas (o `@vercel/analytics` saiu; a Cloudflare só aparece se o token também estiver nas variáveis da Vercel) e a política de privacidade já diz "Azure". Por isso o ideal é **mesclar no mesmo dia da troca de DNS**, seguindo o checklist até o fim.

## Analytics: Cloudflare Web Analytics

Escolhido: grátis, sem cookies (sem banner de consentimento), e funciona sem o DNS do domínio estar na Cloudflare. A política de privacidade já cita a Cloudflare.

Como o token chega ao site: Cloudflare > variável do repositório `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` > argumento de build no job > `next build` escreve o token no JavaScript > o layout renderiza `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"..."}'>`. O token não é segredo (qualquer visitante vê no HTML), por isso é **variável**, não secret. Sem a variável, o site sobe normalmente, só que sem contagem.

Os números aparecem no painel da Cloudflare (Analytics & Logs > Web Analytics) alguns minutos depois das primeiras visitas. Bloqueadores de anúncio barram esse script em parte das visitas; é esperado.

## Checklist de migração (Azure CLI)

Comandos para o PowerShell com o Azure CLI logado (`az login`) na assinatura certa (`az account show`). Troque o que estiver entre `<>`. Os nomes `rg-imperatle`, `imperatle-api` e `imperatle-web` são os que o workflow usa (`RESOURCE_GROUP`, `CONTAINER_APP`, `WEB_CONTAINER_APP`); não mude um sem mudar o outro.

### 0. Antes de começar (um dia antes)

- [ ] Descobrir onde está o DNS: `nslookup -type=NS imperatle.com`. Se aparecer `vercel-dns.com`, os registros são editados na Vercel (Domains), e **o domínio não pode ser apagado da conta da Vercel** no fim, só desligado do projeto. Se aparecer `cloudflare.com`, ver os cuidados do passo 9.
- [ ] Anotar (print) **todos os registros DNS atuais** de `imperatle.com` e `www.imperatle.com`. É para eles que se volta num rollback.
- [ ] Baixar o TTL desses registros para 300 segundos (5 minutos), para a troca e uma eventual volta se espalharem rápido.
- [ ] Conferir se existe registro CAA: `nslookup -type=CAA imperatle.com`. Se existir, adicionar `0 issue "digicert.com"`, senão o certificado do Azure não sai.
- [ ] Não desconectar a Vercel. Ela fica no ar até o fim, como plano B.

### 1. Token do Cloudflare Web Analytics

- [ ] Cloudflare (conta grátis serve) > Analytics & Logs > **Web Analytics** > Add a site > hostname `imperatle.com`.
- [ ] Como o DNS não está (ou não precisa estar) na Cloudflare, ela mostra o trecho de JavaScript para colar à mão. **Não cole o trecho em lugar nenhum**: copie só o valor de `"token"` de dentro dele (uma sequência de letras e números).
- [ ] Guardar o token para o passo 6.

### 2. Preparar o CLI e descobrir o ambiente da API

```
az extension add --name containerapp --upgrade
$RG = "rg-imperatle"
$ENVID = az containerapp show -n imperatle-api -g $RG --query properties.managedEnvironmentId -o tsv
$ENVNAME = ($ENVID -split "/")[-1]
$ENVNAME
```

- [ ] `$ENVNAME` mostrou o nome do ambiente (não ficou vazio).

### 3. Criar o Container App do site (réplica mínima 1)

Ele nasce com uma imagem de exemplo da Microsoft (porta 80). O primeiro deploy do GitHub Actions troca a porta para 8080 e a imagem para a do site, igual faz com a API.

```
az containerapp create `
  -n imperatle-web -g $RG --environment $ENVNAME `
  --image mcr.microsoft.com/k8se/quickstart:latest `
  --ingress external --target-port 80 `
  --cpu 0.25 --memory 0.5Gi `
  --min-replicas 1 --max-replicas 2
```

- `--ingress external`: aberto para a internet, HTTPS feito pelo Azure (HTTP é redirecionado).
- `--min-replicas 1`: a página abre na hora, sem partida a frio (ver "Partida a frio"). `--max-replicas 2` evita que um pico (ou um ataque) multiplique a conta.
- **Nenhuma variável de ambiente em tempo de execução**: tudo o que o site precisa entra no build (passo 6). `PORT=8080`, `HOSTNAME=0.0.0.0` e `NODE_ENV=production` já vêm da imagem.

- [ ] `az containerapp show -n imperatle-web -g $RG --query properties.provisioningState -o tsv` responde `Succeeded`.

### 4. Deixar o Azure baixar a imagem do GHCR

Ver como a API faz hoje:

```
az containerapp registry list -n imperatle-api -g $RG -o table
```

- [ ] **Se aparecer `ghcr.io` com usuário e senha** (um token do GitHub): configurar o mesmo no site. O token precisa do escopo `read:packages`; ele é digitado direto no terminal, nunca salvo em arquivo do repositório.
  ```
  az containerapp registry set -n imperatle-web -g $RG --server ghcr.io --username <USUARIO_GITHUB> --password <TOKEN_COM_READ_PACKAGES>
  ```
- [ ] **Se não aparecer nada** (o pacote `imperatle-api` é público): o pacote `imperatle-web` nasce **privado** no primeiro push, e o primeiro deploy falha no passo "Wait for the new revision" porque o Azure não consegue baixar. Aí: GitHub > perfil > Packages > `imperatle-web` > Package settings > Change visibility > Public, e rodar o workflow de novo. A imagem não tem segredo nenhum (só os `NEXT_PUBLIC_*`, que já são públicos no navegador).

### 5. Permissão do deploy (OIDC)

Os segredos `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` e `AZURE_SUBSCRIPTION_ID` são os mesmos da API. A identidade precisa poder atualizar o app novo. Conferir onde está o papel dela:

```
$APPID = "<AZURE_CLIENT_ID>"
az role assignment list --assignee $APPID --all -o table
```

- [ ] Se o escopo for o grupo `rg-imperatle` (ou a assinatura), nada a fazer.
- [ ] Se for só o `imperatle-api`, dar o mesmo papel no site:
  ```
  $WEBID = az containerapp show -n imperatle-web -g $RG --query id -o tsv
  az role assignment create --assignee $APPID --role Contributor --scope $WEBID
  ```

### 6. Variáveis do repositório no GitHub

GitHub > repositório > Settings > Secrets and variables > Actions > aba **Variables** (não "Secrets": são valores públicos). Ou pelo `gh`:

```
gh variable set NEXT_PUBLIC_CF_ANALYTICS_TOKEN --body "<TOKEN_DO_PASSO_1>"
```

> Desde 11/11/2026 o pagamento é pela Stripe e o site não precisa de nenhuma variável de pagamento: as `NEXT_PUBLIC_PADDLE_*` saíram do Dockerfile e do workflow e podem ser apagadas (`gh variable delete NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` etc.). As chaves da Stripe ficam só na API (ver `stripe-setup.md`).

Argumentos de build que o job passa para a imagem:

| Argumento de build | De onde vem | Observação |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | fixo no workflow (`API_URL`) | `https://api.imperatle.com` |
| `NEXT_PUBLIC_SITE_URL` | fixo no workflow (`WEB_URL`) | `https://imperatle.com` |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | variável do repositório | vazia = site sem contagem de visitas |

- [ ] A variável criada (`gh variable list` confere).

### 7. Primeiro deploy

- [ ] Esta branch mesclada no `main` (ver "Atenção ao mesclar no `main`" acima).
- [ ] `gh variable set AZURE_DEPLOY_WEB --body true` (é a chave que liga o job).
- [ ] Rodar: `gh workflow run ci-cd.yml --ref main` (ou Actions > CI/CD > Run workflow) e acompanhar com `gh run watch`.
- [ ] "Wait for the new revision to be healthy" verde. O "Smoke test" testa primeiro o endereço próprio do app (Azure de verdade) e depois `https://imperatle.com`, que ainda é a Vercel: o aviso "is still served by Vercel" é esperado até o passo 9.
- [ ] Abrir o site novo antes do domínio:
  ```
  az containerapp show -n imperatle-web -g $RG --query properties.configuration.ingress.fqdn -o tsv
  ```
  `https://<esse-endereco>/pt` e `/en` abrem com o jogo. **Login e compra não funcionam nesse endereço** (o cookie de login é de `imperatle.com` e o CORS da API só aceita `imperatle.com`); é esperado.

### 8. Sondas de saúde

Sem isso, o Azure só confere se a porta 8080 aceita conexão. Com elas, confere se o servidor responde de verdade em `/api/health`. Fazer **depois** do primeiro deploy (na imagem de exemplo essa rota não existe). Salvar como `web-probes.yaml` (fora do repositório, por exemplo na pasta temporária):

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
az containerapp show -n imperatle-web -g $RG --query "properties.template.containers[0].name" -o tsv   # tem que ser imperatle-web
az containerapp update -n imperatle-web -g $RG --yaml web-probes.yaml
```

- [ ] A revisão nova ficou `Healthy` (`az containerapp revision list -n imperatle-web -g $RG -o table`). Os próximos deploys (`az containerapp update --image`) mantêm as sondas.

### 9. Domínio `imperatle.com` + `www` e certificado grátis

Pegar os valores:

```
az containerapp env show -n $ENVNAME -g $RG --query properties.staticIp -o tsv                     # IP do ambiente (para o domínio raiz)
az containerapp show -n imperatle-web -g $RG --query properties.customDomainVerificationId -o tsv   # código de verificação
az containerapp show -n imperatle-web -g $RG --query properties.configuration.ingress.fqdn -o tsv   # endereço gerado (para o www)
```

- [ ] No provedor de DNS (passo 0), **trocar** os registros da Vercel por estes:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` (imperatle.com) | o `staticIp` do ambiente |
| TXT | `asuid` | o código de verificação |
| CNAME | `www` | o endereço gerado (`imperatle-web.<algo>.azurecontainerapps.io`) |
| TXT | `asuid.www` | o mesmo código de verificação |

Cuidados:

- Domínio raiz não pode ter CNAME pelo padrão do DNS; por isso o Azure pede **A + TXT** e valida o certificado por **HTTP** (a DigiCert acessa o site). Apagar os registros A antigos da Vercel do `@` (por exemplo `76.76.21.21`), senão parte das visitas continua indo para lá. Se houver **AAAA** no `@`, apagar: o Container Apps não tem IPv6 de entrada.
- O registro `api` (da API) **não muda**.
- **DNS na Cloudflare**: os quatro registros acima ficam **"DNS only" (nuvem cinza)**, não "Proxied". Com o proxy ligado, a emissão e a renovação automática do certificado falham. Use o A no `@`, não o "CNAME flattening".
- O Web Analytics da Cloudflare não depende de nada disso: funciona com o DNS em qualquer lugar.

- [ ] DNS propagado: `nslookup imperatle.com`, `nslookup www.imperatle.com` e `nslookup -type=TXT asuid.imperatle.com` mostram os valores novos.
- [ ] Ligar os domínios e emitir os certificados gerenciados:

```
az containerapp hostname add  --hostname imperatle.com -g $RG -n imperatle-web
az containerapp hostname bind --hostname imperatle.com -g $RG -n imperatle-web --environment $ENVNAME --validation-method HTTP

az containerapp hostname add  --hostname www.imperatle.com -g $RG -n imperatle-web
az containerapp hostname bind --hostname www.imperatle.com -g $RG -n imperatle-web --environment $ENVNAME --validation-method CNAME

az containerapp hostname list -g $RG -n imperatle-web -o table
```

- [ ] Os dois aparecem com o certificado ligado (`SniEnabled`; no portal, "Secured"). Pode levar alguns minutos.

Diferença para a Vercel: lá o `www` provavelmente redireciona para `imperatle.com`. Aqui os dois endereços mostram o site (canonical e hreflang já apontam para `imperatle.com`, então o Google entende). O CORS da API já aceita os dois. Se quiser o redirecionamento, dá para adicionar depois no `proxy.ts`.

### 10. Conferir

- [ ] `https://imperatle.com/pt` e `/en` abrem com o cadeado; `curl -sI https://imperatle.com/api/health` **não** mostra `server: Vercel`.
- [ ] Login com Google, logout, compra no sandbox (o cookie de login volta a funcionar porque o site está de novo em `imperatle.com`).
- [ ] Rodar o workflow mais uma vez: o teste de fumaça passa nos dois endereços e sem o aviso da Vercel.
- [ ] No navegador (aba Network), aparece `beacon.min.js` e um envio para `cloudflareinsights.com`; no painel da Cloudflare, as visitas aparecem em alguns minutos.
- [ ] Alerta de orçamento no Azure (Gerenciamento de Custos > Orçamentos), por exemplo US$ 10 por mês para API mais site.
- [ ] Nova versão em `apps/web/src/lib/changelog.ts`, se for o caso.

### 11. Desligar a Vercel (depois de uns dias tudo bem)

- [ ] Vercel > projeto > Settings > Git > **Disconnect** (para de publicar a cada push).
- [ ] Settings > Domains: remover `imperatle.com` e `www.imperatle.com` **do projeto**. Se o DNS estiver na Vercel (passo 0), não apagar o domínio da conta: os registros DNS moram lá.
- [ ] Manter o projeto parado (não custa nada) para uma volta rápida, ou apagar.
- [ ] No README, a linha "Hosting" passa a dizer "Azure Container Apps (web and API)", e o comentário do topo do `ci-cd.yml` deixa de citar a Vercel.

## Como voltar para a Vercel se algo quebrar

Enquanto a Vercel não for desconectada (passo 11), ela continua publicando cada push do `main`, então está sempre atualizada.

1. No DNS, voltar os registros anotados no passo 0 (o A do `@` e o CNAME do `www` da Vercel). Com TTL de 5 minutos, em poucos minutos o tráfego volta.
2. Os TXT `asuid` podem ficar (não atrapalham).
3. `gh variable set AZURE_DEPLOY_WEB --body false` se não quiser mais deploys no Azure.
4. Nada no código precisa mudar: o `output: "standalone"` é ignorado pela Vercel. Para ter contagem de visitas lá também, pôr `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` nas variáveis do projeto da Vercel e publicar de novo. (A política de privacidade vai dizer "Azure" durante a volta; se ela durar, ajustar o texto em `legal.ts`.)
5. Para parar de pagar o app do Azure sem apagar: `az containerapp update -n imperatle-web -g $RG --min-replicas 0`. Para apagar: `az containerapp delete -n imperatle-web -g $RG`.

Se o problema for só uma versão nova do site, não precisa sair do Azure: rodar o workflow de novo num commit anterior, ou apontar para a imagem boa (cada deploy tem a tag do commit):

```
az containerapp update -n imperatle-web -g $RG --image ghcr.io/afcventura/imperatle-web:<HASH_DO_COMMIT_BOM>
```

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

## Testar a imagem no seu computador

Na pasta `apps/web`, com a API rodando em `http://localhost:5055`:

```
docker build -t imperatle-web --build-arg NEXT_PUBLIC_API_URL=http://host.docker.internal:5055 .
docker run --rm -p 8088:8080 imperatle-web
```

Abra `http://localhost:8088/pt`. (Para a API aceitar conexões vindas do Docker, rode-a ouvindo em todas as interfaces: `$env:ASPNETCORE_URLS = "http://0.0.0.0:5055"`. O navegador não resolve `host.docker.internal`, então partes que o navegador busca direto na API não carregam nesse teste; as páginas montadas no servidor, sim.)

Os outros `NEXT_PUBLIC_*` entram do mesmo jeito (`--build-arg NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...`). Deixe `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` de fora nos testes locais, para não contar visitas de teste no painel da Cloudflare.

## Para depois: Cloudflare Workers

Testado num diretório temporário fora do repositório (nada disso foi commitado): `@opennextjs/cloudflare` 1.20.15 com `wrangler` 4.157.0 compila o site sem mudar código.

- Tamanho do worker: **7.648 KiB sem compressão, 1.654 KiB (1,6 MiB) com gzip**, medido com `wrangler deploy --dry-run`.
- Limites do Workers: **3 MiB no plano grátis, 10 MiB no pago** (US$ 5 por mês), contando o tamanho comprimido. Cabe no grátis, com folga de uns 1,3 MiB.
- Rodou localmente no `wrangler dev`: `/` redireciona, `/pt`, `/en` e `/api/health` respondem 200.
- Avisos: o `proxy.ts` (middleware em Node.js) roda, mas o OpenNext avisa que esse suporte é experimental na Cloudflare. As rotas de desenvolvimento (`/api/geo/*`, que puxam turf e polygon-clipping) entram no worker mesmo respondendo 404; tirá-las do build de produção deixaria o worker menor.
- O plano grátis do Workers permite uso comercial, mas tem limite de 100 mil requisições por dia e 10 ms de CPU por requisição (renderizar a página do jogo pode passar disso; o pago dá 30 s). Seria a opção mais barata se o site crescer, mas é uma migração própria.
