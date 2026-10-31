# Variáveis de ambiente da web (`trajetto-ui`)

Este documento lista cada variável que a web lê, para que serve, se é
obrigatória, o formato, o valor em desenvolvimento, staging e produção, se é
segredo e onde ela é configurada. O modelo comentado é o
[`.env.example`](../.env.example). O passo a passo do Dokploy está em
[`deploy.md`](./deploy.md). Os valores que precisam casar com a API e com o
app (URL da API, origem da web, `RATE_LIMIT_FORWARDER_SECRET`, Turnstile, R2)
estão numa tabela só, igual nos três repositórios:
[`deploy.md` → Os três repositórios juntos](./deploy.md#20-os-três-repositórios-juntos).

> Nunca escreva um valor real (segredo ou não) neste repositório. Aqui ficam
> só nomes, formatos e exemplos fictícios.

## Sumário

- [Onde cada valor mora](#onde-cada-valor-mora)
- [A regra do `NEXT_PUBLIC_`](#a-regra-do-next_public_)
- [Runtime da aplicação (Environment da Application no Dokploy)](#runtime-da-aplicação-environment-da-application-no-dokploy)
- [Definidas pela imagem (não mexa)](#definidas-pela-imagem-não-mexa)
- [Configurado na Application, não por variável](#configurado-na-application-não-por-variável)
- [Build da imagem](#build-da-imagem)
- [GitHub Actions: secrets e variables](#github-actions-secrets-e-variables)
- [Só desenvolvimento e testes](#só-desenvolvimento-e-testes)
- [Nomes antigos que não existem mais](#nomes-antigos-que-não-existem-mais)
- [Modelos prontos por ambiente](#modelos-prontos-por-ambiente)
- [Como gerar os segredos](#como-gerar-os-segredos)

## Onde cada valor mora

| Lugar                                                                    | O que vai lá                                                                              | Quem lê                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `.env` local (gitignored)                                                | desenvolvimento. Copie do `.env.example`                                                  | `next dev` (o Next lê `.env` e `.env.development`) |
| **Environment da Application no Dokploy** (uma Application por ambiente) | tudo de runtime, staging e produção                                                       | o contêiner, a cada requisição                     |
| **GitHub → Settings → Secrets and variables → Actions**                  | o build arg `METADATA_BASE`, a API do Dokploy, o gate de rotas, o token de leitura da API | `.github/workflows/*.yml`                          |
| **GitHub → Settings → Environments** (`staging`, `production`)           | secrets que só o job daquele ambiente deve ver                                            | os jobs `deploy-staging` e `promote-production`    |

A imagem é **uma só** para staging e produção. **Nada** de ambiente vai no
build, exceto `METADATA_BASE` (sempre a origem de produção) e `GIT_SHA`.
Trocar um valor de runtime no Dokploy exige só um **Redeploy** da
Application, sem build novo.

O boot (`src/instrumentation.ts` → `src/env/server.ts`) confere as
variáveis. Se faltar uma obrigatória, ou se alguma for inválida, o servidor
não sobe e lista no log **o nome** de cada uma (nunca o valor), por exemplo
`PUBLIC_API_URL: obrigatória (substitui NEXT_PUBLIC_HTTP_REQUEST)`.

## A regra do `NEXT_PUBLIC_`

O Next embute no bundle, **no momento do build**, todo
`process.env.NEXT_PUBLIC_*` que ele encontra. Se a URL da API fosse
`NEXT_PUBLIC_`, a imagem de staging levaria a URL de staging para a produção.
Por isso, **nenhuma variável de ambiente usa esse prefixo**. A única
`NEXT_PUBLIC_` que existe é `NEXT_PUBLIC_BUILD_SHA`, gerada pelo `Dockerfile`
a partir do commit, e ela é a mesma em qualquer ambiente.

Os valores que o navegador precisa são lidos pelo servidor por requisição e
entregues à página (`src/env/public-config.ts`, veja `arquitetura.md`).

## Runtime da aplicação (Environment da Application no Dokploy)

Legenda: **Obrig.** = obrigatória. **Seg.** = é segredo (não compartilhe, não
logue, não reaproveite entre ambientes). "Público" = vai para o navegador.

| Variável                      | Para que serve                                                                                                                                                                                                          | Obrig.                                                                                                    | Formato / exemplo                                                                                                                                                                                                                                                                                  | Desenvolvimento                      | Staging                                                                                            | Produção                                                                 | Seg.                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                    | modo do Node e do Next. `production` liga as exigências de produção do boot (Turnstile, `METADATA_BASE`)                                                                                                                | sim                                                                                                       | `development` ou `production`                                                                                                                                                                                                                                                                      | `development`                        | `production` (a imagem já define)                                                                  | `production` (a imagem já define)                                        | não                                                                                                                |
| `APP_ENV`                     | qual implantação é esta. Decide `robots.txt` e `X-Robots-Tag` (staging = `noindex`) e o fallback do mapa. Vazia = `production` num servidor de produção. Valor desconhecido = tratado como `staging`                    | **sim no Dokploy** (esquecer em staging publicaria o staging nos buscadores)                              | `development`, `staging` ou `production`                                                                                                                                                                                                                                                           | `development`                        | `staging`                                                                                          | `production`                                                             | não                                                                                                                |
| `METADATA_BASE`               | origem canônica do site (canonicals, Open Graph, sitemap, links absolutos) nas páginas renderizadas por requisição. Público                                                                                             | sim quando `NODE_ENV=production`                                                                          | URL `https://…`, ex. `https://www.intrajetto.com`                                                                                                                                                                                                                                                  | `http://localhost:3000`              | a origem do staging, ex. `https://staging.intrajetto.com`                                          | `https://www.intrajetto.com`                                             | não                                                                                                                |
| `HTTP_REQUEST`                | URL da API usada **pelo servidor da web** (Server Components, Server Actions, relay, portal `/docs`). Pode ser interna                                                                                                  | sim                                                                                                       | URL `http(s)://…`, sem barra no fim                                                                                                                                                                                                                                                                | `http://localhost:3333`              | a URL da API de staging (pública, ou o endereço interno do serviço na rede do Dokploy, porta 3333) | a URL da API de produção (idem)                                          | não                                                                                                                |
| `PUBLIC_API_URL`              | URL da API usada **pelo navegador** (uploads, links do `/docs`) e host do Socket.IO, que roda na própria API. Público                                                                                                   | sim                                                                                                       | URL pública `https://…`                                                                                                                                                                                                                                                                            | `http://localhost:3333`              | `https://api-staging.intrajetto.com`                                                               | a definir (previsto `https://api.intrajetto.com`)                        | não                                                                                                                |
| `TURNSTILE_SITE_KEY`          | chave do site do captcha Cloudflare (login, recuperação de senha, orçamento). Público                                                                                                                                   | sim quando `NODE_ENV=production`                                                                          | texto da Cloudflare                                                                                                                                                                                                                                                                                | vazio (o captcha não aparece em dev) | a chave de um widget que aceite o host de staging                                                  | a chave do widget de produção                                            | não (é pública por natureza)                                                                                       |
| `TURNSTILE_SECRET_KEY`        | segredo do Turnstile, usado só no servidor para validar o token                                                                                                                                                         | sim quando `NODE_ENV=production`                                                                          | texto da Cloudflare                                                                                                                                                                                                                                                                                | vazio                                | o segredo do widget de staging                                                                     | o segredo do widget de produção                                          | **sim**                                                                                                            |
| `RATE_LIMIT_FORWARDER_SECRET` | segredo compartilhado com a API. Login, 2FA, recuperação de senha, refresh e rastreio público saem do servidor da web, e com o segredo a API conta cada navegador pelo próprio IP                                       | na prática sim em staging e produção. O boot só recusa um valor com menos de 32 caracteres                | 32+ caracteres, **o mesmo valor** de `RATE_LIMIT_FORWARDER_SECRET` na API daquele ambiente                                                                                                                                                                                                         | o mesmo da API local, ou vazio       | próprio de staging                                                                                 | próprio de produção                                                      | **sim**                                                                                                            |
| `CSP_STORAGE_ORIGINS`         | origens das URLs pré-assinadas (upload e download) na CSP. Com a origem do bucket do ambiente, o navegador só envia e baixa arquivos do bucket **deste** ambiente, e não de qualquer conta R2                           | não, mas recomendada em staging e produção                                                                | origens separadas por vírgula. Vazio = `https://*.r2.cloudflarestorage.com` (qualquer bucket R2). A API pré-assina no estilo virtual-hosted (`https://<bucket>.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`), salvo se `R2_ENDPOINT` estiver definida lá (aí é path-style e a origem é a do endpoint) | vazio                                | `https://trajetto-staging-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`                        | `https://trajetto-prod-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` | não                                                                                                                |
| `MAP_TILE_URL`                | mapa de fundo da torre, da página da rota e do seletor de local (decisão 7.4). O host entra sozinho na CSP. Público                                                                                                     | não. Sem ela, em staging e produção os mapas ficam sem fundo e a tela avisa (o boot só registra um aviso) | modelo Leaflet `https://…/{z}/{x}/{y}.png`, `{s}` opcional, ex. `https://{s}.provedor.com/{z}/{x}/{y}.png?key=…`                                                                                                                                                                                   | vazio (usa o OpenStreetMap público)  | o provedor comercial                                                                               | o provedor comercial                                                     | a URL pode levar a chave do provedor. Essa chave é visível no navegador, então restrinja-a por domínio no provedor |
| `MAP_TILE_ATTRIBUTION`        | crédito do provedor exibido no mapa (texto simples)                                                                                                                                                                     | sim se houver `MAP_TILE_URL` (sem ela, o boot avisa e o mapa mostra um crédito genérico)                  | texto, ex. `© Provedor © colaboradores do OpenStreetMap`                                                                                                                                                                                                                                           | vazio                                | o crédito do provedor                                                                              | o crédito do provedor                                                    | não                                                                                                                |
| `MAP_TILE_URL_DARK`           | estilo escuro, usado com o tema escuro (decisão 16.123). Inválida = boot falha. Sem `MAP_TILE_URL`, é ignorada com aviso                                                                                                | não                                                                                                       | mesmo formato da `MAP_TILE_URL`                                                                                                                                                                                                                                                                    | vazio                                | opcional                                                                                           | opcional                                                                 | idem `MAP_TILE_URL`                                                                                                |
| `MAP_TILE_ATTRIBUTION_DARK`   | crédito do estilo escuro. Vazia = repete `MAP_TILE_ATTRIBUTION`                                                                                                                                                         | não                                                                                                       | texto                                                                                                                                                                                                                                                                                              | vazio                                | opcional                                                                                           | opcional                                                                 | não                                                                                                                |
| `BACKGROUND_TRACKING`         | `true` tira o aviso da torre de que só aparece motorista com o app aberto (decisão 7.3). Ligue junto com `EXPO_PUBLIC_BACKGROUND_TRACKING` do app, depois da declaração de localização em segundo plano no Play Console | não                                                                                                       | `true` ou vazio                                                                                                                                                                                                                                                                                    | vazio                                | igual ao app de staging                                                                            | igual ao app de produção                                                 | não                                                                                                                |
| `NODE_OPTIONS`                | teto do heap do V8. O heap deve parar antes do limite de memória do contêiner, para dar um "heap out of memory" limpo e não um SIGKILL do cgroup                                                                        | recomendada no Dokploy                                                                                    | `--max-old-space-size=512` (com limite de memória de 768 MiB)                                                                                                                                                                                                                                      | não use                              | `--max-old-space-size=512`                                                                         | `--max-old-space-size=512`                                               | não                                                                                                                |

## Definidas pela imagem (não mexa)

| Variável                  | Valor na imagem               | Observação                                                           |
| ------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| `PORT`                    | `3000`                        | a porta do contêiner. No Dokploy, o domínio aponta para a porta 3000 |
| `HOSTNAME`                | `0.0.0.0`                     | o servidor `standalone` escuta em todas as interfaces                |
| `NEXT_TELEMETRY_DISABLED` | `1`                           |                                                                      |
| `NODE_ENV`                | `production`                  |                                                                      |
| `NEXT_PUBLIC_BUILD_SHA`   | o commit do build (`GIT_SHA`) | devolvido em `/build-id.json`                                        |
| `METADATA_BASE`           | a origem de produção do build | sobrescrita pelo valor de runtime                                    |

O código também lê `NEXT_RUNTIME` (em `src/instrumentation.ts`), mas quem a
define é o próprio Next.js (`nodejs` ou `edge`, conforme o runtime que carrega
o arquivo). Não se configura em lugar nenhum.

## Configurado na Application, não por variável

A web roda como **Application** do Dokploy (provider Docker, imagem do GHCR),
uma no project `trajetto-ui` de cada environment. Estes valores não são
variáveis de ambiente: ficam nas abas da própria Application
([`deploy.md`](./deploy.md), seções 6 e 7).

| O quê                                    | Onde no Dokploy                       | Produção                                               | Staging                                             |
| ---------------------------------------- | ------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| imagem e tag                             | General → Provider Docker             | `ghcr.io/trajetto-organization/trajetto-ui:stable`     | `ghcr.io/trajetto-organization/trajetto-ui:staging` |
| credencial do registry                   | General / Cluster Settings → Registry | `ghcr` (PAT classic com `read:packages`)               | idem                                                |
| host, porta e HTTPS                      | Domains                               | `www.intrajetto.com`, porta 3000, Let's Encrypt        | `staging.intrajetto.com`, porta 3000, Let's Encrypt |
| domínio sem www com HSTS                 | Cloudflare ou arquivo do Traefik      | `intrajetto.com` → `www` (`deploy.md`, seções 8 e 18)  | opcional                                            |
| réplicas                                 | Advanced → Cluster Settings           | `1`                                                    | `1`                                                 |
| health check, update, rollback e restart | Advanced → Swarm Settings             | JSON da seção 6.4 do `deploy.md`                       | idem                                                |
| limite de memória                        | Advanced → Resources → Memory Limit   | `805306368` (768 MiB). Suba junto com o `NODE_OPTIONS` | idem                                                |

## Build da imagem

| Variável        | Onde                                                    | Para que serve                                                                                                                                                                |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `METADATA_BASE` | secret de repositório do GitHub, passado como build arg | a origem de **produção**, impressa nos canonicals das páginas pré-renderizadas no build (landing, blog, legais). É igual para os dois ambientes, e o staging nunca é indexado |
| `GIT_SHA`       | o workflow passa `${{ github.sha }}`                    | vira `NEXT_PUBLIC_BUILD_SHA`. Vazio (build local) desliga a comparação de versão das abas                                                                                     |

## GitHub Actions: secrets e variables

Configure em **Settings → Secrets and variables → Actions** (repositório) e
em **Settings → Environments → `staging` / `production` → Environment
secrets**. Os nomes de environment não diferenciam maiúsculas: um `Production`
criado antes serve como `production`.

### Secrets

| Nome                         | Escopo recomendado                                            | Usado por                                                                                 | Para que serve                                                                                                            | Sem ele                                                                                                   |
| ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `METADATA_BASE`              | repositório                                                   | `deploy.yml` → `build` (build arg) e `promote-production` (conferência do rollout)        | origem de produção, ex. `https://www.intrajetto.com`                                                                      | build com canonicals vazios; o promote não confere o rollout (aviso)                                      |
| `METADATA_BASE_STAGING`      | environment `staging` (ou repositório)                        | `deploy-staging`                                                                          | origem do staging, para esperar o `/build-id.json`                                                                        | a conferência do rollout de staging é pulada (aviso)                                                      |
| `DOKPLOY_URL`                | environments `staging` e `production`                         | `deploy-staging`, `promote-production`                                                    | URL do painel do Dokploy (`https://…`), para o `application.deploy`                                                       | sem os três `DOKPLOY_*`, o deploy é pulado com aviso (a tag move mesmo assim); com só alguns, o job falha |
| `DOKPLOY_API_KEY`            | environments `staging` e `production`                         | idem                                                                                      | chave de API do Dokploy (a mesma da `trajetto-api` serve)                                                                 | idem                                                                                                      |
| `DOKPLOY_UI_APPLICATION_ID`  | environments `staging` e `production` (um id em cada)         | idem                                                                                      | id da Application `trajetto-ui` daquele environment (último trecho da URL dela no painel)                                 | idem                                                                                                      |
| `API_DOCS_URL`               | environment `production`                                      | `promote-production`                                                                      | `https://<API de produção>/docs/json`, para o gate de rotas (`scripts/check-api-routes.mjs`)                              | o gate é pulado com aviso                                                                                 |
| `DOCS_USER`, `DOCS_PASSWORD` | environment `production`                                      | idem                                                                                      | Basic auth do `/docs` da API de produção (os mesmos `DOCS_USER`/`DOCS_PASSWORD` da API)                                   | o gate falha ao ler o documento (código 2) se `API_DOCS_URL` existir sem eles                             |
| `API_REPO_READ_TOKEN`        | **repositório** (o `ci.yml` chamado roda fora de environment) | `ci.yml`, `browser-suites.yml`                                                            | token de leitura de `Trajetto-Organization/trajetto-api`: fine-grained PAT com _Contents: Read-only_ só nesse repositório | `ci.yml` pula os testes de socket; as suítes de navegador são puladas (aviso)                             |
| `GITHUB_TOKEN`               | automático                                                    | login no GHCR, semantic-release, leitura dos runs de staging no promote (`actions: read`) |                                                                                                                           |                                                                                                           |

A chave de API do Dokploy dá acesso ao painel inteiro. Trate-a como senha.

### Variables

| Nome                 | Valor  | Efeito                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMAGE_SCAN_ENFORCE` | `true` | o Trivy passa a **falhar** o build numa vulnerabilidade CRITICAL com correção (um scan que não conseguiu rodar, por banco indisponível ou erro do Trivy ou do GHCR, continua só avisando: não é achado); o build não ganha `staged-<commit>` e um merge dele em `main` é recusado. Sem ela, só relata, e o resumo do run separa achado de falha no download |
| `ROLLOUT_VERIFY`     | `off`  | desliga a espera pelo `/build-id.json` (só em emergência; fica registrado no resumo do run)                                                                                                                                                                                                                                                                 |

### Para apagar (nada mais lê)

`DOKPLOY_STAGING_WEBHOOK_URL` e `DOKPLOY_PRODUCTION_WEBHOOK_URL` (o deploy
passou a ser pela API do Dokploy em 27/10/2026), `STAGING_ENABLED`,
`DOKPLOY_COMPOSE_ID` (do desenho com Compose), `PORTAINER_WEBHOOK_URL`,
`PORTAINER_STAGING_WEBHOOK_URL`, `NEXT_PUBLIC_SANITY_*`,
`SANITY_WEBHOOK_SECRET`, `NEXT_PUBLIC_HTTP_REQUEST`,
`NEXT_PUBLIC_HTTP_REQUEST_STAGING`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e
`NEXT_PUBLIC_TURNSTILE_SITE_KEY_STAGING`.

## Só desenvolvimento e testes

Nenhuma destas vai para o Dokploy.

| Variável                                | Quem lê                                                 | Para que serve                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANALYZE`                               | `next.config.mjs`                                       | `true` grava os treemaps do bundle analyzer em `<distDir>/analyze/`                                                                                                  |
| `NEXT_DIST_DIR`                         | `next.config.mjs`                                       | outra pasta de build, para uma build de produção ao lado do `next dev`                                                                                               |
| `NEXT_DEV_KEEP_PAGES`                   | `next.config.mjs`                                       | `1` mantém compiladas as rotas abertas no `next dev` (suítes de navegador)                                                                                           |
| `E2E_PROBES`                            | `src/app/(protected)/dashboard/boundary-probe/page.tsx` | `1` abre a página que quebra de propósito numa build de produção (só no CI das suítes)                                                                               |
| `TURNSTILE_SITEVERIFY_URL`              | `src/lib/turnstile-siteverify.ts`                       | siteverify local das suítes de navegador. Só vale com chave secreta de teste da Cloudflare e para loopback; uma chave real sempre vai à Cloudflare. Nunca no Dokploy |
| `RESPONSIVE_BASE_URL`                   | configs do Playwright e specs                           | URL da web nas suítes (padrão `http://localhost:3100`)                                                                                                               |
| `LOAD_BASE_URL`                         | specs de `tests/ui`                                     | URL da API nas suítes (padrão `http://localhost:3334`)                                                                                                               |
| `UI_SKIP_WARM_UP`                       | `tests/ui/support/warm-up.ts`                           | `1` pula o aquecimento das rotas                                                                                                                                     |
| `WEB_E2E_PASSWORD`                      | `tests/ui/support/login.ts`                             | senha das contas de `mint-browser-users.ts`                                                                                                                          |
| `DATABASE_URL`                          | `tests/ui/support/*`                                    | banco descartável (porta 54321) para os `mint-*.ts`                                                                                                                  |
| `E2E_DEV_SERVER`                        | `tests/ui/support/ui.ts`                                | `1` quando a web das suítes é o `next dev`: recarga única por chunk quebrado                                                                                         |
| `E2E_DOUBLES_PORT`                      | `tests/ui/support/suite-config.ts`                      | porta do dublê do siteverify que as configs das suítes sobem (padrão 3199)                                                                                           |
| `RATE_LIMIT_FORWARDER_SECRET`           | `tests/ui/support/login.ts`                             | no processo do Playwright, o mesmo da API e da web: cada login conta como uma pessoa                                                                                 |
| `CI`                                    | configs do Playwright                                   | `forbidOnly` nas quatro; 1 nova tentativa nas suítes de navegador; 1 worker e nenhuma nova tentativa em `tests/E2E`                                                  |
| `MUTATION_TESTS`                        | `vitest.mutation.config.ts`                             | globs (separados por vírgula) dos testes que o Stryker roda                                                                                                          |
| `MUTATION_STATIC`                       | `stryker.config.mjs`                                    | `1` inclui os mutantes estáticos                                                                                                                                     |
| `LEGAL_FACTS_API`, `LEGAL_FACTS_MOBILE` | `tests/unitaires/legal-facts.test.ts`                   | apontam para outra cópia da API ou do app                                                                                                                            |

Os guias do portal (`src/content/docs/*.mdx`) usam `TRAJETTO_API_URL`,
`TRAJETTO_API_KEY` e `TRAJETTO_WEBHOOK_SECRET` nos exemplos. Essas variáveis
são do **cliente da API pública**, não desta web.

## Nomes antigos que não existem mais

| Antigo                                                                                  | Novo                   | Observação                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_HTTP_REQUEST`                                                              | `PUBLIC_API_URL`       | o erro de boot cita o substituto                                                                                                                                                                                            |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                                        | `TURNSTILE_SITE_KEY`   | idem                                                                                                                                                                                                                        |
| `NEXT_PUBLIC_MAP_TILE_URL`                                                              | `MAP_TILE_URL`         | idem                                                                                                                                                                                                                        |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`                                                      | `MAP_TILE_ATTRIBUTION` | idem                                                                                                                                                                                                                        |
| `PUBLIC_SOCKET_URL`                                                                     | `PUBLIC_API_URL`       | removida em 25/10/2026. O Socket.IO roda sempre na própria API, então o navegador conecta o socket em `PUBLIC_API_URL` e a CSP libera o `wss://` dessa mesma origem. Se ainda existir no Dokploy, nada a lê: apague a linha |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_WEBHOOK_SECRET`  | nenhum                 | o blog virou MDX no repositório. Não há CMS                                                                                                                                                                                 |
| `GITHUB_ACCESS_TOKEN` (num `.env.production` local antigo)                              | nenhum                 | nada lê. Se ainda existir no seu disco, revogue o token no GitHub e apague a linha                                                                                                                                          |
| `ROUTER_PREFIX`, `WEB_HOST`, `WEB_APEX_HOST`, `TRAEFIK_NETWORK`, `TRAEFIK_CERTRESOLVER` | nenhum                 | eram do compose de produção, que não existe mais. Domínio na aba Domains; apex na Cloudflare ou no arquivo do Traefik (`deploy.md`, seção 18)                                                                               |
| `UI_IMAGE_TAG`, `UI_HEAP_MB`, `UI_MEMORY_LIMIT`                                         | nenhum                 | idem. A tag fica no Provider da Application, o heap em `NODE_OPTIONS` e o limite em Advanced → Resources                                                                                                                    |

Os arquivos `.env.development`, `.env.production` e `.env.staging` são
gitignored. Só o `.env` local é necessário em desenvolvimento.

## Modelos prontos por ambiente

Exemplos fictícios. Troque os hosts pelos seus e gere os segredos.

`<R2_ACCOUNT_ID>` é o mesmo `R2_ACCOUNT_ID` da API daquele ambiente. Com
`CSP_STORAGE_ORIGINS` apontando para o bucket do próprio ambiente, a página só
envia e baixa arquivos desse bucket.

**Desenvolvimento (`.env`):**

```dotenv
NODE_ENV="development"
APP_ENV="development"
METADATA_BASE="http://localhost:3000"
HTTP_REQUEST="http://localhost:3333"
PUBLIC_API_URL="http://localhost:3333"
RATE_LIMIT_FORWARDER_SECRET=""   # o mesmo da API local, se ela tiver
```

**Staging (Environment da Application `trajetto-ui`, environment `staging` do Dokploy):**

```dotenv
APP_ENV=staging
METADATA_BASE=https://staging.intrajetto.com
HTTP_REQUEST=https://api-staging.intrajetto.com
PUBLIC_API_URL=https://api-staging.intrajetto.com
TURNSTILE_SITE_KEY=<chave do site do widget de staging>
TURNSTILE_SECRET_KEY=<segredo do widget de staging>
RATE_LIMIT_FORWARDER_SECRET=<o mesmo da API de staging>
CSP_STORAGE_ORIGINS=https://trajetto-staging-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
MAP_TILE_URL=<modelo https do provedor>
MAP_TILE_ATTRIBUTION=<crédito do provedor>
NODE_OPTIONS=--max-old-space-size=512
```

**Produção (Environment da Application `trajetto-ui`, environment `production` do Dokploy):**

```dotenv
APP_ENV=production
METADATA_BASE=https://www.intrajetto.com
HTTP_REQUEST=https://<host da API de produção; previsto api.intrajetto.com>
PUBLIC_API_URL=https://<host da API de produção; previsto api.intrajetto.com>
TURNSTILE_SITE_KEY=<chave do site do widget de produção>
TURNSTILE_SECRET_KEY=<segredo do widget de produção>
RATE_LIMIT_FORWARDER_SECRET=<o mesmo da API de produção>
CSP_STORAGE_ORIGINS=https://trajetto-prod-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
MAP_TILE_URL=<modelo https do provedor>
MAP_TILE_ATTRIBUTION=<crédito do provedor>
NODE_OPTIONS=--max-old-space-size=512
```

## Como gerar os segredos

| Segredo                                       | Como obter                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RATE_LIMIT_FORWARDER_SECRET`                 | gere **uma vez por ambiente**, com `openssl rand -hex 32`, e cole o mesmo valor na API e na web daquele ambiente                                             |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | painel da Cloudflare → Turnstile → Add widget, com os hostnames do ambiente (`www.intrajetto.com`, `intrajetto.com`; o host de staging no widget de staging) |
| `DOKPLOY_API_KEY`                             | Dokploy → **Settings → Profile → API/CLI** → Generate (a mesma chave da `trajetto-api` serve)                                                                |
| `DOKPLOY_UI_APPLICATION_ID`                   | o último trecho da URL da Application `trajetto-ui` no painel (`…/application/<id>`), um por environment                                                     |
| `API_REPO_READ_TOKEN`                         | GitHub → Settings → Developer settings → Fine-grained tokens, com dono `Trajetto-Organization`, só o repositório `trajetto-api` e _Contents: Read-only_      |
| `DOCS_USER` / `DOCS_PASSWORD`                 | os mesmos configurados na API de produção                                                                                                                    |
| Credencial do GHCR no Dokploy                 | PAT _classic_ com só `read:packages` (veja `deploy.md`)                                                                                                      |
