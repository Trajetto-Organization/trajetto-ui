# Deploy da web (`trajetto-ui`): staging e produção

Este documento é o manual completo do deploy da web: o fluxo de branches, os
workflows do GitHub Actions, a configuração do GitHub, a montagem da web no
Dokploy como **Application** puxando a imagem do GHCR, o primeiro deploy, a
promoção para produção, o rollback e a operação do dia a dia.

> **Estado em 09/10/2026:** o Dokploy ainda não foi criado. Os workflows já
> estão prontos. Enquanto os secrets do Dokploy não existem, o pipeline
> constrói e publica a imagem no GHCR, move as tags `staging` e `stable` e
> **pula** o deploy com um aviso. Quando você criar as Applications e
> cadastrar os secrets do Dokploy (seções 5 a 7), os deploys passam a acontecer
> sozinhos.

Documentos irmãos: [`variaveis-de-ambiente.md`](./variaveis-de-ambiente.md)
(cada variável e o valor por ambiente), [`arquitetura.md`](./arquitetura.md) e
[`testes.md`](./testes.md). A API e o serviço local de IA têm o manual deles
em `trajetto-api/docs/deploy.md`. O mapa da infraestrutura feita à mão (as
contas, os painéis da Contabo, do Dokploy, da Cloudflare, do GitHub e da Expo,
os tokens e o porquê de cada configuração) fica em
[`trajetto-api/docs/infraestrutura.md`](https://github.com/Trajetto-Organization/trajetto-api/blob/staging/docs/infraestrutura.md).

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Fluxo de branches](#2-fluxo-de-branches)
3. [Os workflows](#3-os-workflows)
4. [Configurar o GitHub (uma vez)](#4-configurar-o-github-uma-vez)
5. [Preparar o Dokploy (uma vez)](#5-preparar-o-dokploy-uma-vez)
6. [Criar a Application `trajetto-ui` de staging](#6-criar-a-application-trajetto-ui-de-staging)
7. [Criar a Application `trajetto-ui` de produção](#7-criar-a-application-trajetto-ui-de-produção)
8. [Domínio sem www, HSTS e Cloudflare](#8-domínio-sem-www-hsts-e-cloudflare)
9. [O que a web precisa da API (e do serviço de IA)](#9-o-que-a-web-precisa-da-api-e-do-serviço-de-ia)
10. [Checklist do primeiro deploy](#10-checklist-do-primeiro-deploy)
11. [Promover para produção](#11-promover-para-produção)
12. [Rollback](#12-rollback)
13. [Ordem entre web e API](#13-ordem-entre-web-e-api)
14. [Conferir depois de cada deploy](#14-conferir-depois-de-cada-deploy)
15. [CSP e relatórios de violação](#15-csp-e-relatórios-de-violação)
16. [Suítes de navegador no pipeline](#16-suítes-de-navegador-no-pipeline)
17. [Recursos, logs e retenção de imagens](#17-recursos-logs-e-retenção-de-imagens)
18. [O que a Application não cobre: Traefik, logs e encerramento](#18-o-que-a-application-não-cobre-traefik-logs-e-encerramento)
19. [Solução de problemas](#19-solução-de-problemas)
20. [Os três repositórios juntos](#20-os-três-repositórios-juntos)

---

## 1. Visão geral

```
branch de trabalho ──push──▶ ci.yml (audit, Prettier, ESLint, tsc, unitários, regras, gitleaks)
        │
        └─PR─▶ staging ──push──▶ deploy.yml
                                  ├─ validate        (chama ci.yml)
                                  ├─ browser-suites  (chama browser-suites.yml: ui, a11y, responsive)
                                  ├─ build           UMA imagem ─▶ ghcr.io/trajetto-organization/trajetto-ui:sha-<commit>
                                  └─ deploy-staging  tag `staging` ─▶ deploy pela API do Dokploy (staging) ─▶ /build-id.json
                                                        │
        staging ──PR──▶ main   (ci.yml + browser-suites.yml validam o merge)
                          │
                     merge commit ──push──▶ deploy.yml
                                  ├─ promote-production  (environment `production`, aprovação)
                                  │    acha o build que o staging serviu (staged-<commit>) ─▶ gate de rotas da API
                                  │    ─▶ tag `stable` = mesmo digest ─▶ deploy pela API do Dokploy (produção) ─▶ /build-id.json
                                  └─ release             semantic-release (tag, CHANGELOG, GitHub Release)
```

Os princípios que não mudam:

- **Uma imagem, construída uma vez, promovida por digest (decisão 12.2).** A
  produção roda, byte a byte, a imagem que o staging validou. Nada é
  reconstruído para produção. Isso só funciona porque toda configuração de
  ambiente é lida **em runtime** (`PUBLIC_API_URL`, `TURNSTILE_SITE_KEY`,
  `MAP_TILE_URL` etc., veja `variaveis-de-ambiente.md`).
- **Tags:**
  - `sha-<7 primeiros caracteres do commit>`: **imutável**. Uma por build,
    no mesmo formato das imagens da API. É por ela
    que o promote acha a imagem e que o rollback volta.
  - `staging`: móvel. Aponta para o digest que roda em staging.
  - `stable`: móvel. Aponta para o digest que roda em produção.
  - `main-<sha>`: imutável. São os builds do desenho antigo, que só servem
    para rollback.
  - Não existe `latest`.
- **API primeiro, web depois.** O promote confere se a API de produção serve
  todas as rotas que a build chama (seção 13).
- **O deploy só é verde quando o site serve o build novo.** Depois do
  deploy no Dokploy, o job espera o `/build-id.json` responder o commit promovido por
  90 s seguidos, mais do que a janela de 30 s do rollback automático do Swarm.
- **O pipeline só reprova por defeito do código.** Versões e imagens fixas,
  rede de terceiros só com repetição visível, nenhum erro de transporte lido
  como resposta e nada de "rode de novo" (seção 3, "Regras de estabilidade
  dos três workflows").

Imagem: `ghcr.io/trajetto-organization/trajetto-ui`, Node 22 Alpine, saída
`standalone` do Next, porta **3000**, health check em `/api/health`,
usuário sem privilégio, só amd64. O runtime é Alpine com só o binário do
`node` copiado da imagem oficial (sem npm, yarn nem corepack), e os
`node_modules` da saída `standalone` vão numa camada própria, que não muda
entre commits sem mudança de dependência. A camada do `node` sai igual em
todo build, com ou sem cache, e é o mesmo blob da imagem da API (estágio
`node-binary` idêntico nos dois `Dockerfile`, mesmos digests de base): a VPS
baixa esses ~46 MB uma vez para as duas imagens. Para manter isso, suba a
versão do Node nos dois repositórios juntos (`docs/arquitetura.md`, "A
imagem Docker").

## 2. Fluxo de branches

| Branch               | Para quê                                                             | Quem faz push                                                 |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| `feat/*`, `fix/*`, … | trabalho                                                             | você. Cada push roda o `ci.yml`                               |
| `staging`            | o que vai para o ambiente de staging. **Todo código passa por aqui** | merge de PR das branches de trabalho (ou push direto do dono) |
| `main`               | o que roda em produção                                               | **só merge de PR vindo de `staging`**                         |

Passo a passo de uma mudança:

1. Trabalhe numa branch. Cada push roda o `ci.yml`.
2. Abra um PR para `staging` e faça o merge. O push em `staging` dispara o
   `deploy.yml`: validação completa → imagem `sha-<commit>` → tag `staging`
   → deploy no Dokploy de staging.
3. Teste no staging (seção 14).
4. Abra um PR **de `staging` para `main`**. O `ci.yml` e o
   `browser-suites.yml` validam o resultado do merge.
5. Faça o merge com **"Create a merge commit"** (ou fast-forward). **Não use
   "Squash and merge" nem "Rebase and merge"**: eles criam um commit que o
   staging nunca construiu, e o promote falha com "A imagem … não existe no
   GHCR". Para evitar o engano, deixe só o merge commit habilitado no
   repositório (Settings → General → Pull Requests).
6. O push em `main` dispara o `promote-production`. Aprove no environment
   `production`, e o job promove a imagem do commit de staging.
7. O semantic-release cria a versão e commita o `CHANGELOG.md` em `main` com
   `[skip ci]`. **Depois de cada release, faça o merge de `main` em
   `staging`** para o staging receber o CHANGELOG. O promote ignora
   diferenças só no `CHANGELOG.md`. Como esse merge só traz documentação,
   ele pode ir com `[skip ci]` (próximo bloco):
   `git checkout staging && git merge main -m "chore: merge main em staging [skip ci]" && git push`.

**Commit só de documentação (`[skip ci]`).** Um commit que só mexe em
documentação (arquivos `*.md` e a pasta `docs/`) pode ir para `staging` com
`[skip ci]` na mensagem. O GitHub não roda workflow nenhum para ele, o que
economiza a rodada inteira do pipeline. Isso é seguro desde 30/10/2026
(decisão D11):

- a imagem não muda: o `.dockerignore` tira `docs/` e `**/*.md` do build,
  exatamente o que conta como documentação
  (`.github/scripts/docs-only.mjs`, `tests/unitaires/docs-only.test.ts`);
- o promote aceita o commit sem execução própria em staging e promove o build
  do ancestral mais próximo que o staging serviu, desde que tudo entre os dois
  seja documentação. Se alguma outra coisa entrou sem passar pelo pipeline, o
  promote recusa e lista os arquivos (seção 11);
- se o commit de documentação chegar enquanto o pipeline do commit anterior
  ainda roda, esse run faz o deploy e grava o `staged-<commit>` dele mesmo
  assim. Antes, ele via outro commit na ponta, pulava o deploy e ninguém
  publicava.

Dois cuidados que continuam valendo:

- **PR para `main` com `[skip ci]` na ponta:** o GitHub também não roda os
  workflows de `pull_request` quando a mensagem do commit da ponta do PR tem
  `[skip ci]`. Se o Ruleset de `main` exige os checks do PR (seção 4), eles
  ficam pendentes. Para destravar sem esperar outro commit, rode **Run
  workflow** do `CI` e do `Browser suites` na branch `staging`: os checks
  saem no mesmo commit e aparecem no PR. Confira também o **título do PR**:
  num PR de um commit só, o GitHub o preenche com a mensagem desse commit, e
  o título vai para o corpo do merge commit. Com `[skip ci]` no título, o
  push em `main` não roda o `deploy.yml` e nada é promovido. Tire o
  `[skip ci]` do título antes do merge.
- Os testes que leem a documentação (links, trechos do `docs/deploy.md`) não
  rodam num commit `[skip ci]`. Um erro neles aparece no próximo push com
  código. Rode `yarn test:unit` antes de subir uma mudança grande de doc.

Um commit que mexe em qualquer outra coisa (código, `package.json`,
workflow, `Dockerfile`, `.mdx` do site) nunca vai com `[skip ci]`: o promote
recusa.

**Hotfix:** mesmo caminho, mais rápido. Branch `fix/...` → PR para
`staging` → espere o deploy de staging → PR `staging` → `main`. Um commit
feito direto em `main`, sem passar por staging, faz o promote **recusar** o
merge seguinte ("O merge … difere do commit de staging …"), porque a produção
rodaria uma imagem sem aquela mudança.

## 3. Os workflows

### `ci.yml`: validação

| Gatilho             | Quando                                               |
| ------------------- | ---------------------------------------------------- |
| `push`              | qualquer branch, exceto `main`, `master` e `staging` |
| `pull_request`      | para `main`                                          |
| `workflow_call`     | chamado pelo `deploy.yml` num push em `staging`      |
| `workflow_dispatch` | manual                                               |

Jobs:

- **`validate`**: `yarn install --frozen-lockfile` → `audit-ci` → `yarn
lint:check` (Prettier) → `yarn lint` (as regras do ESLint que o `next
build` aplica) → `yarn typecheck` → `yarn test:unit --coverage` (publica o
  artefato `coverage-<sha>`; uma falha do serviço de artefatos não reprova,
  porque a cobertura não é gate) → `yarn test:rules`. Com
  `API_REPO_READ_TOKEN`, faz checkout da API ao lado para os testes de
  socket (a branch é escolhida como no `browser-suites.yml`, abaixo).
- **`audit-ci`** (decisão D1): um aviso CRITICAL numa dependência de
  produção **bloqueia** só quando o push ou o PR mexe em `package.json`,
  `yarn.lock`, `package-lock.json` ou `audit-ci.jsonc` (as exceções, com data
  de revisão). Nos outros casos o audit roda, mas o achado vira um aviso no
  run e uma seção no resumo, sem reprovar. O motivo: o banco de avisos é
  vivo, e um aviso publicado hoje reprovava a próxima correção sem relação
  com dependência, no mesmo commit que passou ontem. A base da comparação é
  o commit base do PR, ou o commit de onde o push moveu a branch
  (`.github/scripts/dependency-gate.mjs`). Sem base (branch nova, execução
  manual) ou com a base indisponível, o audit bloqueia. Um audit que não
  conseguiu falar com o registry (só a frase "Failed security audit due to"
  é veredito) repete até 3 vezes com pausa crescente; persistindo, bloqueia
  só onde um veredito bloquearia, com mensagem de rede, nunca como aviso de
  segurança. O vigia contínuo é o Dependabot (_security updates_). Um aviso que aparece como "não bloqueia"
  precisa ser tratado antes da próxima mudança de dependência, porque aí ele
  bloqueia. Uma mudança de dependência que chegue à `staging` sem run próprio
  (num `[skip ci]`, o que a regra da seção 2 proíbe, ou num run pendente que o
  GitHub trocou pelo do push seguinte) não entra no diff do push seguinte, e
  ali o achado só avisa. A produção continua protegida: o PR `staging → main`
  compara com a `main`, vê a mudança e bloqueia.
- **`secrets`**: gitleaks no **histórico inteiro**, com a imagem fixada por
  digest e `--redact`.

### `browser-suites.yml`: suítes de navegador

| Gatilho             | Quando                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| `workflow_call`     | chamado pelo `deploy.yml` num push em `staging` (a imagem só é construída se passar) |
| `pull_request`      | para `main`                                                                          |
| `workflow_dispatch` | manual                                                                               |

Não há agendamento: um build que passou aqui não roda de novo. A rodada
noturna só repetia o que o push em `staging` e o PR para `main` já tinham
aprovado, e consumia a maior parte dos minutos do mês do Actions.

Ele sobe a stack do zero: Postgres 16 e Redis 7 como service containers
(fixados por digest), a API (checkout da mesma branch na `trajetto-api`),
migrations, seed, as sessões de teste, a API em `:3334` e a web em `:3100` a
partir do servidor `standalone` da build de produção. Depois roda `ui`,
`a11y` e `responsive` no Chromium. As suítes não chegam a nenhum terceiro:
tiles, Turnstile, ViaCEP, Nominatim e o renderizador do console da API são
dublês locais, e o login valida o captcha no dublê do siteverify
(`TURNSTILE_SITEVERIFY_URL`). O job dá o mesmo `RATE_LIMIT_FORWARDER_SECRET`
de teste à API, à web e ao Playwright: cada contexto do navegador é uma
pessoa para o limite de login da API. Sem `API_REPO_READ_TOKEN`, o job
`gate` pula tudo com um aviso. Detalhes na seção 16 e em `testes.md`.

A branch da API: a mesma do push ou do PR, se a `trajetto-api` tiver uma com
esse nome; senão, a padrão. Só a resposta "essa branch não existe" (código 2
do `git ls-remote --exit-code`) cai na padrão, com um aviso no run. Um erro
de rede ou de credencial é repetido até 4 vezes, com espera crescente, e
depois o job falha dizendo que não foi "branch inexistente" (decisão D8).
Antes, um erro de rede fazia a web ser testada em silêncio contra a `main`
da API.

O que fica em cache entre corridas (decisão D9): o Chromium do Playwright
(chave na versão instalada do `@playwright/test`), os engines do Prisma que
o `yarn install` da API baixa (`~/.cache/prisma`, chave na versão do
`@prisma/engines` no `yarn.lock` da API) e o renderizador do console da API
(chave no arquivo que fixa a versão dele na API).

### `deploy.yml`: build, staging, promote e release

| Job                  | Roda em                                                                  | Faz                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate`           | push em `staging`                                                        | chama `ci.yml`                                                                                                                                                                                                                                             |
| `browser-suites`     | push em `staging`                                                        | chama `browser-suites.yml`                                                                                                                                                                                                                                 |
| `build`              | push em `staging`, depois dos dois acima                                 | build **único** com cache GHA, SBOM e proveniência (`mode=min`), push de `sha-<commit>`, Trivy por digest (só relata até `IMAGE_SCAN_ENFORCE=true`)                                                                                                        |
| `deploy-staging`     | depois do `build` (environment `staging`)                                | confere se o run ainda é o HEAD de `staging` (runs mais velhos param, verdes, salvo se o HEAD novo só traz documentação), move `staging` para o digest, faz o deploy pela API do Dokploy, espera o `/build-id.json` e, por último, grava `staged-<commit>` |
| `promote-production` | push em `main`, ou **Run workflow** em `main` (environment `production`) | acha o build que o staging serviu (seção 11), roda o gate de rotas, move `stable` para o digest, faz o deploy no Dokploy, espera o `/build-id.json`                                                                                                        |
| `release`            | push em `main`, depois do promote                                        | semantic-release: tag, `CHANGELOG.md` e GitHub Release                                                                                                                                                                                                     |

Antes do push, o `build` carrega a imagem no runner e roda um smoke test:
o container sobe sem rede, com valores descartáveis, precisa passar no
próprio HEALTHCHECK, responder o commit em `/build-id.json` e devolver um
AVIF pelo otimizador de imagens (sharp). Se falhar, nada vai para o GHCR. O
push seguinte publica o mesmo build, do cache do builder.

Concorrência: um run por branch de cada vez (`deploy-<ref>`), e
`deploy-staging` e `promote-production` com grupos próprios, nunca cancelados
no meio. Permissões: `contents: read` por padrão; `packages: write` só em
`build`, `deploy-staging` e `promote-production`; `contents/issues/pull-requests:
write` só no `release`. As actions são fixadas por SHA, com a versão
comentada.

Scripts usados pelos jobs:

- `.github/scripts/dokploy-deploy.mjs`: o **mesmo script** da
  `trajetto-api` (um teste compara os dois). Chama `application.deploy` na
  API do Dokploy e acompanha o deployment que ele criou: falha na hora se o
  Dokploy não conseguir rodar o deploy (imagem que não baixa, chave ou id
  errado) e, quando o deployment termina em `error`, dispara de novo, até 6
  tentativas (`DOKPLOY_ATTEMPTS`), com pausas de 20, 40, 80, 160 e 160 s, cada
  uma com um aviso no run. Foi assim que o download da imagem
  interrompido pelo IPv6 da VPS (27/10/2026) deixou de quebrar o run. A
  causa, a rota IPv6 da VPS até o GitHub, se resolve no host: o servidor
  prefere IPv4 (`gai.conf` e `GODEBUG=netdns=cgo` no Docker,
  `trajetto-api/docs/deploy.md`, seção 6.2). Exige
  https e nunca imprime a chave. Antes dele, o job confere os três secrets:
  nenhum = Dokploy ainda não existe (aviso, run verde); só alguns = erro de
  configuração (falha).
- `.github/scripts/wait-for-build.mjs`: consulta `<site>/build-id.json` pela
  borda real (Cloudflare e Traefik) até responder o commit esperado por 90 s
  seguidos (`WAIT_STABLE_SECONDS`), com limite de 600 s
  (`WAIT_TIMEOUT_SECONDS`). Só uma **resposta** zera a janela: outro commit,
  ou um build sem id. Uma consulta sem resposta (timeout, 5xx ou 52x da
  borda, 403, uma página no lugar do JSON) não conta nem a favor nem contra,
  e o total delas vai para um aviso e para o resumo (decisão D10). A janela
  só fecha numa resposta do commit esperado, então erros sozinhos nunca
  aprovam.
- `.github/scripts/ghcr.mjs`: toda leitura e toda troca de tag no GHCR
  (`digest`, `revision`, `create`). Separa a resposta "essa tag não existe"
  (código 3) de um login recusado (falha na hora) e de um erro de transporte
  (repetido até 4 vezes, com espera crescente e um aviso por tentativa,
  depois falha dizendo que foi o registry). Antes, `2>/dev/null || true`
  transformava um 502 do GHCR em "a imagem não existe".
- `.github/scripts/staged-build.mjs`: no promote, acha o build que o staging
  serviu para o commit do merge, espera um run de staging ainda em
  andamento e aplica a regra do commit só de documentação (seção 11).
- `.github/scripts/docs-only.mjs`: diz se a diferença entre dois commits é
  só documentação (`*.md` e `docs/`). Usado pelo `deploy-staging` e pelo
  promote.
- `.github/scripts/dependency-gate.mjs`: decide se o `audit-ci` bloqueia
  (seção acima).
- `scripts/check-api-routes.mjs`: o gate de rotas (seção 13).

### Regras de estabilidade dos três workflows

Desde 30/10/2026, um pipeline só reprova por defeito do código. "Rode de
novo" não é solução para nada que esteja nesta lista:

- **Versões fixas (D3).** O Node dos workflows é o `22.21.1` das imagens,
  nunca "o 22 do dia". Os service containers do `browser-suites.yml`
  (`postgres:16-alpine` e `redis:7-alpine`) e o BuildKit do build
  (`moby/buildkit:v0.33.1`) rodam por digest, com a tag ao lado. Os digests
  de Postgres e Redis são os mesmos nos três repositórios. Para atualizar:
  `docker buildx imagetools inspect postgres:16-alpine` (e
  `redis:7-alpine`), copie o `Digest` do índice e troque nos três
  repositórios no mesmo dia. O Dependabot não mexe em imagem citada dentro de
  workflow.
- **Prazo em todo job (D4).** Cada job tem `timeout-minutes` com folga sobre
  a duração medida. Os jobs que só chamam outro workflow (`validate` e
  `browser-suites` do `deploy.yml`) herdam o prazo dos jobs chamados: o
  GitHub não aceita prazo neles.
- **`bash -eo pipefail` em todo passo (D5).** Os três workflows declaram
  `defaults.run.shell: bash`, e um comando que falha no meio de um pipe
  reprova o passo. Nenhum passo lê a saída de um pipe sem conferir o código
  (o `git ls-remote | cut` do `deploy-staging` deixava o HEAD vazio e pulava o
  deploy, verde) nem usa `cmd | grep -q` (o `grep` fecha o pipe cedo e mata o
  `cmd` com SIGPIPE).
- **Rede de terceiros só com repetição visível.** Consulta ao repositório
  irmão (D8), leitura do HEAD, GHCR, banco do Trivy, API do GitHub e o
  `/docs/json` do gate repetem um erro de transporte com espera crescente e
  um `::warning::` por tentativa, e depois falham dizendo o que foi. Uma
  resposta (branch inexistente, tag inexistente, rota faltando, login
  recusado) nunca é repetida como se fosse erro. Os testes nunca são
  repetidos para esconder falha: a única nova tentativa é a das suítes de
  navegador, e um teste que só passa nela vira aviso (`testes.md`, "Testes
  instáveis").
- **Cache nunca reprova (D9).** O `cache-to` do build tem
  `ignore-error=true`, e os uploads de relatório (cobertura, traces) têm
  `continue-on-error`.

## 4. Configurar o GitHub (uma vez)

No repositório `Trajetto-Organization/trajetto-ui`:

1. **Criar a branch `staging`** a partir de `main`, se ela não existir:
   `git checkout main && git pull && git checkout -b staging && git push -u origin staging`.
2. **Environments** (Settings → Environments):
   - `staging`: sem aprovação. Em _Deployment branches and tags_, escolha
     **Selected branches** → `staging`.
   - `production`: em _Required reviewers_, marque **você** (e quem mais
     puder aprovar produção, até 6 pessoas). _Prevent self-review_ é
     opcional (deixe desmarcado se você for o único aprovador). Em
     _Deployment branches and tags_, escolha **Selected branches** → `main`.
     Opcional: _Wait timer_ de alguns minutos.
   - Se já existirem `Staging` e `Production` com maiúscula, eles servem: o
     nome não diferencia maiúsculas.
3. **Secrets e variables:** todos estão na tabela de
   [`variaveis-de-ambiente.md` → GitHub Actions](./variaveis-de-ambiente.md#github-actions-secrets-e-variables).
   Resumo:
   - repositório: `METADATA_BASE` e `API_REPO_READ_TOKEN`;
   - environment `staging`: `DOKPLOY_URL`, `DOKPLOY_API_KEY`,
     `DOKPLOY_UI_APPLICATION_ID` e `METADATA_BASE_STAGING`;
   - environment `production`: `DOKPLOY_URL`, `DOKPLOY_API_KEY`,
     `DOKPLOY_UI_APPLICATION_ID`, `API_DOCS_URL`, `DOCS_USER` e
     `DOCS_PASSWORD`;
   - apague os secrets antigos listados lá.
4. **Proteção de branches**: use **Rulesets** (Settings → Rules →
   Rulesets → New branch ruleset), não a regra clássica de branch. O motivo
   é o job `release`: o semantic-release (`@semantic-release/git`) faz push
   do commit do `CHANGELOG.md` **direto em `main`** com o `GITHUB_TOKEN`.
   Uma regra que exige PR ou status checks recusa esse push, e todo promote
   terminaria vermelho no Release, sem tag, sem CHANGELOG e sem GitHub
   Release (e o passo 7 da seção 2 fica sem o que mergear em `staging`). A
   regra clássica não deixa o `GITHUB_TOKEN` passar por cima; o Ruleset
   deixa.
   - Ruleset `main`: _Target branches_ → `main`. Regras: _Require a pull
     request before merging_; _Require status checks to pass_, com os
     checks do PR: `Validate (audit, lint, types, unit and rule tests)`,
     `Secret scan (gitleaks)` e `UI, a11y and responsive against a running
stack` (o check das suítes só aparece depois que o `API_REPO_READ_TOKEN`
     existir); _Block force pushes_. **Não** marque _Require linear history_
     (o fluxo usa merge commit).
   - No mesmo Ruleset, em _Bypass list_ → **Add bypass** → app **GitHub
     Actions**, modo _Always allow_. É ele que autoriza o push do
     `CHANGELOG.md` feito pelo `GITHUB_TOKEN` do job `release`. Ninguém
     mais entra na lista.
   - Se a sua conta não oferecer o app GitHub Actions na bypass list, a
     alternativa é um GitHub App próprio (ou um PAT fine-grained de um
     usuário bot com _Contents: write_ só neste repositório) na bypass
     list, com o token dele no lugar de `secrets.GITHUB_TOKEN` no passo
     `Release` do `deploy.yml`. Hoje o workflow usa o `GITHUB_TOKEN`.
   - Ruleset `staging`: _Block force pushes_ e, se quiser, _Require a pull
     request before merging_ (sem bypass: nada no pipeline faz push em
     `staging`).
   - Para conferir: depois do primeiro promote, o job `Release` precisa
     terminar verde e o commit `chore(release): …` aparecer em `main`. Se
     ele falhar com `GH006: Protected branch update failed` (ou
     `refusing to allow`), falta o bypass.
5. **Merge:** em Settings → General → Pull Requests, deixe só **Allow merge
   commits** habilitado.
6. **Pacote no GHCR:** o primeiro push cria o pacote
   `trajetto-ui` na organização, ligado ao repositório. Se o pacote já
   existir de antes, confira em _Package settings → Manage Actions access_
   que o repositório tem papel **Write**. Deixe o pacote **privado**.

## 5. Preparar o Dokploy (uma vez)

Pré-requisitos:

- Uma VPS amd64 com o Dokploy instalado. O instalador inicia o Docker Swarm e
  sobe o Traefik dele (contêiner `dokploy-traefik`, rede `dokploy-network`,
  portas 80 e 443).
- A configuração do Traefik vem de `trajetto-api/infra/traefik/`: redirect de
  :80 para :443, `readTimeout` de 120 s e TLS 1.2 ou maior. O passo a passo
  está em `trajetto-api/infra/traefik/README.md`.
- O DNS dos hosts da web apontando para a VPS. Com a Cloudflare na frente
  (proxy laranja), use o modo SSL **Full (strict)**.

Conferir no host:

```sh
docker exec dokploy-traefik traefik version        # v3.x
docker network ls | grep dokploy-network            # a rede do Traefik
```

### 5.1 Credencial do GHCR

As imagens são privadas. O Dokploy precisa de uma credencial só de leitura:

1. No GitHub: Settings (da sua conta) → Developer settings → Personal access
   tokens → **Tokens (classic)** → Generate new token. Marque **só
   `read:packages`**. Dê um nome como `dokploy-ghcr-read` e uma validade, e
   anote a data de renovação. Os tokens fine-grained não cobrem o GHCR de
   forma confiável; use o classic.
2. No Dokploy: **Settings → Registry → Add registry** (o nome do menu varia
   entre versões):
   - Registry name: `ghcr`
   - Registry URL: `ghcr.io`
   - Username: o seu usuário do GitHub
   - Password: o token do passo 1
   - Use **Test** para validar.

O mesmo registro serve para a API e o `trajetto-ai`.

### 5.2 Ambientes e projetos

O Dokploy tem dois **environments**, `staging` e `production`. Em cada um
há dois **projects**:

| Project        | O que fica nele                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trajetto-api` | PostgreSQL (com o backup diário do próprio Dokploy) e Redis (Databases), e as Applications `trajetto-ai` e `trajetto-api` (veja `trajetto-api/docs/deploy.md`) |
| `trajetto-ui`  | **uma** Application, `trajetto-ui`: esta web. Sem banco, sem Redis, sem volume (seções 6 e 7)                                                                  |

Tudo é **Application → provider Docker → imagem do GHCR**. Não há Compose
nem template. O Dokploy roda cada Application como um serviço do Swarm atrás
do Traefik dele, e todos os serviços dividem a rede overlay
`dokploy-network`. O nome DNS de um serviço nessa rede é o _App Name_ que o
painel mostra.

## 6. Criar a Application `trajetto-ui` de staging

1. No Dokploy, abra o environment **`staging`** e o project
   **`trajetto-ui`**.
2. **Create Service → Application**. Name: `trajetto-ui`. Description:
   `Web (Next.js), imagem do GHCR`.
3. O Dokploy gera um **App Name** (por exemplo `trajetto-ui-a1b2c3`). Ele é
   o nome do serviço no Swarm e o nome DNS na `dokploy-network`. Anote-o: é
   ele que aparece em `docker service ls`, no rollback de emergência (seção 12) e no arquivo do Traefik (seção 18).
4. Siga as subseções abaixo **na ordem**. Só clique em **Deploy** no fim
   (6.6): sem o Environment, o servidor não sobe.

### 6.1 Provider (aba General)

- Provider: **Docker**.
- Docker Image: `ghcr.io/trajetto-organization/trajetto-ui:staging`
- Registry: o `ghcr` da seção 5.1 (ou preencha usuário e senha no próprio
  formulário, conforme a versão do Dokploy).
- Salve.

A tag `staging` só existe depois do primeiro push em `staging` (seção 10).

### 6.2 Environment

Aba **Environment**: cole as variáveis de staging e salve. A lista completa,
com o valor de cada ambiente e o motivo de cada uma, está em
[`variaveis-de-ambiente.md`](./variaveis-de-ambiente.md). O mínimo é:

```dotenv
APP_ENV=staging
METADATA_BASE=https://staging.intrajetto.com
HTTP_REQUEST=https://<host da API de staging>
PUBLIC_API_URL=https://<host da API de staging>
TURNSTILE_SITE_KEY=<chave do site, widget de staging>
TURNSTILE_SECRET_KEY=<segredo, widget de staging>
RATE_LIMIT_FORWARDER_SECRET=<o mesmo da API de staging>
CSP_STORAGE_ORIGINS=https://trajetto-staging-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
MAP_TILE_URL=<modelo https do provedor>
MAP_TILE_ATTRIBUTION=<crédito do provedor>
NODE_OPTIONS=--max-old-space-size=512
```

`HTTP_REQUEST` pode ser o endereço interno da API na rede `dokploy-network`
(`http://<App Name da API>:3333`), o que evita a volta pela Cloudflare. Na
dúvida, use a URL pública, que sempre funciona.

`PUBLIC_API_URL` também é o host do Socket.IO, que roda na própria API: não
há variável separada para o socket.

`CSP_STORAGE_ORIGINS` limita uploads e downloads ao bucket **deste**
ambiente. `<R2_ACCOUNT_ID>` é o mesmo `R2_ACCOUNT_ID` da API de staging; a API
pré-assina no estilo virtual-hosted
(`https://<bucket>.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`). Vazia, a CSP
aceita qualquer bucket R2 (`https://*.r2.cloudflarestorage.com`).

O servidor **não sobe** se faltar uma obrigatória. Veja o log da Application:
ele lista o nome de cada variável faltando.

### 6.3 Domains

**Add Domain**:

- Host: `staging.intrajetto.com`
- Path: `/`
- Container Port: **3000**
- HTTPS: ligado. Certificate: **Let's Encrypt** (com a Cloudflare em
  _Full (strict)_, o desafio HTTP passa pelo proxy; se falhar, desligue o
  proxy só durante a emissão)
- Salve.

O Dokploy cria o roteador do Traefik da Application, no arquivo
`/etc/dokploy/traefik/dynamic/<App Name>.yml`. Não acrescente labels de
Traefik à mão: o que vai além do domínio (o redirect do domínio sem www com
HSTS) fica num arquivo próprio (seção 18).

### 6.4 Advanced: Swarm, recursos e saúde

O `Dockerfile` já tem um `HEALTHCHECK` (`wget` em `/api/health`, intervalo de
30 s, start de 60 s, 3 tentativas), que o Swarm usa se nada for definido.
Esta seção é o único registro versionado da configuração da Application: o
teste `tests/unitaires/application-swarm-settings.test.ts` lê os blocos
abaixo. Mudou aqui ou no painel, atualize os dois e rode o teste.

**Advanced → Cluster Settings:** _Replicas_ = `1`. _Registry_: o `ghcr` da
seção 5.1. Salve.

**Advanced → Swarm Settings:** cada campo abaixo é um JSON da API do Docker,
com durações em **nanossegundos**. Cole cada um no campo do mesmo nome e
salve.

O start de 120 s e as 5 tentativas dão folga ao primeiro boot num host
carregado.

_Health Check_:

```json
{
  "Test": [
    "CMD",
    "wget",
    "-q",
    "-O",
    "/dev/null",
    "http://127.0.0.1:3000/api/health"
  ],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 120000000000,
  "Retries": 5
}
```

O Update Config sobe a nova task antes de derrubar a velha e volta sozinho se
a nova não ficar saudável em 30 s. O pipeline espera o `/build-id.json` por
90 s seguidos, mais do que essa janela.

_Update Config_:

```json
{
  "Parallelism": 1,
  "Delay": 5000000000,
  "FailureAction": "rollback",
  "Monitor": 30000000000,
  "Order": "start-first"
}
```

_Rollback Config_:

```json
{
  "Parallelism": 1,
  "Delay": 5000000000,
  "FailureAction": "pause",
  "Monitor": 30000000000,
  "Order": "start-first"
}
```

O Restart Policy não tem limite de tentativas: a web não tem estado, e um
limite contado ao longo da vida do serviço já deixou o site fora do ar sem
ninguém saber. Um slot que o Swarm abandonou volta com
`docker service update --force <App Name>`.

_Restart Policy_:

```json
{ "Condition": "any", "Delay": 5000000000 }
```

_Mode_: `{ "Replicated": { "Replicas": 1 } }` (o mesmo número do Cluster
Settings). Deixe _Placement_, _Labels_ e _Network_ vazios: o Dokploy já liga
o serviço à `dokploy-network`.

**Advanced → Resources:** _Memory Limit_ = `805306368` (768 MiB, em bytes).
Não defina reserva nem limite de CPU: a reserva pode deixar a task sem lugar
num host pequeno, e o limite de CPU piora a latência. O heap do Node
(`NODE_OPTIONS=--max-old-space-size=512`, seção 6.2) fica abaixo desse
limite, para um vazamento terminar num "heap out of memory" limpo e não num
SIGKILL do cgroup. Suba os dois juntos.

**Volumes:** nenhum. A web não tem estado em disco.

**Banco de dados e Redis:** nenhum. A web só fala com a API.

**Encerramento e rotação de log:** o Dokploy não tem campo para os dois na
Application. Veja a seção 18.

### 6.5 Secrets do deploy (API do Dokploy)

O pipeline faz o deploy pela API do Dokploy, como a `trajetto-api`, e não
pelo webhook da Application: o webhook responde 200 assim que enfileira o
deploy, e uma falha do Dokploy (imagem que não baixou) só aparecia 10 minutos
depois, quando o `/build-id.json` não mudava.

1. **Id da Application:** abra a Application `trajetto-ui` do environment
   `staging`; o id é o último trecho da URL do painel
   (`…/application/<id>`).
2. **Chave de API:** Dokploy → **Settings → Profile → API/CLI** →
   **Generate**. A mesma chave da `trajetto-api` serve (ela vale para o
   painel inteiro). Trate-a como senha.
3. No GitHub (`Trajetto-Organization/trajetto-ui` → Settings →
   Environments → `staging`), crie os secrets:
   - `DOKPLOY_URL`: a URL do painel, `https://…` (sem barra no fim);
   - `DOKPLOY_API_KEY`: a chave;
   - `DOKPLOY_UI_APPLICATION_ID`: o id do passo 1;
   - `METADATA_BASE_STAGING=https://staging.intrajetto.com` (a origem que o
     job consulta para conferir o `/build-id.json`).
4. Apague os secrets antigos `DOKPLOY_STAGING_WEBHOOK_URL` e
   `DOKPLOY_PRODUCTION_WEBHOOK_URL`: nada mais os lê.

O deploy só pede ao Dokploy que puxe a tag de novo e role o serviço. Quem
escolhe **qual** imagem roda é a tag `staging`, movida pelo pipeline. O
**Auto Deploy** da Application não é usado (ele só liga o webhook) e pode
ficar desligado.

### 6.6 Primeiro deploy

Clique em **Deploy** e acompanhe em _Logs_. Depois:

```sh
curl -s https://staging.intrajetto.com/api/health     # {"status":"ok",...}
curl -s https://staging.intrajetto.com/build-id.json  # {"sha":"<commit>"}
curl -s https://staging.intrajetto.com/robots.txt     # Disallow: /
```

## 7. Criar a Application `trajetto-ui` de produção

Igual à seção 6, no environment **`production`**, project **`trajetto-ui`**,
com estas diferenças:

| Item            | Produção                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nome            | `trajetto-ui`, no environment `production`, project `trajetto-ui`                                                                                                                                                                                                                                                              |
| Docker Image    | `ghcr.io/trajetto-organization/trajetto-ui:stable`                                                                                                                                                                                                                                                                             |
| Environment     | `APP_ENV=production`, `METADATA_BASE=https://www.intrajetto.com`, URLs da API de produção, widget do Turnstile de produção, `RATE_LIMIT_FORWARDER_SECRET` de produção, `CSP_STORAGE_ORIGINS=https://trajetto-prod-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` (só o bucket de produção; veja `variaveis-de-ambiente.md`) |
| Domain          | `www.intrajetto.com`, porta 3000, HTTPS com Let's Encrypt                                                                                                                                                                                                                                                                      |
| Domínio sem www | `intrajetto.com` redireciona para `www` com HSTS (seção 8). **Não** cadastre o apex como domínio da Application                                                                                                                                                                                                                |
| Deploy          | secrets `DOKPLOY_URL`, `DOKPLOY_API_KEY` e `DOKPLOY_UI_APPLICATION_ID` (o id da Application de **produção**) no environment `production` do GitHub. O job confere o `/build-id.json` na origem do secret de repositório `METADATA_BASE`                                                                                        |

Os segredos de produção **nunca** são os mesmos de staging.

**`stable` no primeiro deploy:** a tag `stable` só existe depois do primeiro
promote. Na primeira vez, use a imagem `…/trajetto-ui:sha-<commit>` (o mesmo
commit que está em staging), faça o deploy, rode o promote (seção 11, que
cria `stable`) e só então troque a imagem da Application para `:stable`.

## 8. Domínio sem www, HSTS e Cloudflare

A web responde em `www.intrajetto.com`. O domínio sem www (`intrajetto.com`)
precisa **redirecionar com 301** para `https://www.intrajetto.com/<mesmo
caminho>` e mandar **HSTS com preload no próprio redirect**. A lista de
preload exige HSTS no domínio sem www; sem isso, o `preload` que o `www`
manda (`next.config.mjs`) não vale nada, e uma primeira visita a
`http://intrajetto.com` numa rede hostil fica sujeita a SSL stripping.

Com a Cloudflare na frente, faça isso nela:

1. **DNS:** `intrajetto.com` (apex) e `www` com proxy ligado.
2. **Rules → Redirect Rules → Create rule** (Single Redirect):
   - When: _Hostname equals_ `intrajetto.com`
   - Then: _Dynamic_, expressão
     `concat("https://www.intrajetto.com", http.request.uri.path)`, status
     **301**, _Preserve query string_ ligado.
3. **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)**:
   habilite com _Max Age_ de 2 anos (63072000), _Include subdomains_ e
   _Preload_. Com isso, a Cloudflare manda o cabeçalho em todas as respostas
   da zona, inclusive no 301 do apex.
4. Confira:

   ```sh
   curl -sI http://intrajetto.com/blog | grep -iE "^(location|strict-transport)"
   curl -sI https://intrajetto.com/blog | grep -iE "^(location|strict-transport)"
   ```

   Esperado: `location: https://www.intrajetto.com/blog` e
   `strict-transport-security: max-age=63072000; includeSubDomains; preload`.

Sem Cloudflare (ou se preferir que o redirect não dependa dela), faça o
mesmo no Traefik do Dokploy com o arquivo da seção 18. O teste
`tests/unitaires/edge-hsts.test.ts` guarda esse arquivo e o HSTS que o
`next.config.mjs` manda no `www`.

No staging, o domínio sem www é opcional (o staging nunca é indexado). Se
quiser testar o mesmo redirect antes da produção, crie uma regra igual para
um segundo host de staging.

**WAF e bots:** o pipeline consulta `/build-id.json` a partir de IPs de
datacenter do GitHub. Com _Bot Fight Mode_ ou uma regra que desafia bots,
crie uma exceção para o caminho `/build-id.json`. Sem ela, o run mostra
`HTTP 403` até estourar o prazo.

## 9. O que a web precisa da API (e do serviço de IA)

A web não tem banco, Redis, fila nem IA própria. Tudo isso é da API, e o
manual da API (`trajetto-api/docs/deploy.md`) cobre Postgres, Redis,
migrations, backups e o serviço local de IA/OCR (`trajetto-api/infra/ai-ocr`,
a Application `trajetto-ai` no project `trajetto-api`, sem domínio,
ligada à API pelo token `AI_LOCAL_TOKEN`). **A web
não tem variável de IA**: a leitura de fotos e a verificação por IA chegam
pela API, como qualquer outro dado.

O que precisa casar entre web e API em cada ambiente:

| Na web                                               | Na API                                                               | Por quê                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HTTP_REQUEST` e `PUBLIC_API_URL`                    | o host da API (`API_HOST`)                                           | a web chama a API                                                                                                                                                                                                                                  |
| a origem da web (`METADATA_BASE`)                    | `HTTP_REQUEST` da API = a origem desta web                           | CORS e Socket.IO da API aceitam só essa origem                                                                                                                                                                                                     |
| `RATE_LIMIT_FORWARDER_SECRET`                        | `RATE_LIMIT_FORWARDER_SECRET`                                        | o mesmo valor. Diferente = todos os logins contados como um IP só (429 para todo mundo)                                                                                                                                                            |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`        | `TURNSTILE_SECRET_KEY` (o mesmo valor) e `TURNSTILE_REQUIRED` da API | o mesmo widget, para a API validar o token que a web manda                                                                                                                                                                                         |
| a origem da web                                      | CORS do bucket R2 do ambiente                                        | o navegador envia fotos direto ao R2 por URL pré-assinada (`PUT`). Sem a regra, o upload falha antes de sair da aba                                                                                                                                |
| `CSP_STORAGE_ORIGINS`                                | o bucket (`R2_*`)                                                    | a CSP libera só a origem do bucket do ambiente: `https://trajetto-staging-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` em staging, `https://trajetto-prod-storage.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` em produção (vazio = qualquer R2) |
| `secrets.API_DOCS_URL`, `DOCS_USER`, `DOCS_PASSWORD` | `/docs/json` e `DOCS_*` da API de produção                           | gate de rotas do promote                                                                                                                                                                                                                           |

CORS do bucket R2 (painel da Cloudflare → R2 → bucket → Settings → CORS
Policy), um por ambiente, com a origem da web daquele ambiente:

```json
[
  {
    "AllowedOrigins": ["https://www.intrajetto.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Portal `/docs`:** a referência é renderizada no servidor a partir de
`GET ${HTTP_REQUEST}/integration/docs/openapi.json`, o documento **público**
da API, sem autenticação, com cache de 5 minutos. Um deploy da API muda a
referência em até 5 minutos, sem deploy da web. `/docs/console` redireciona
para `<API>/integration/docs`, usando o `servers` do documento (que vem do
`API_HTTP_REQUEST` da API). Se o portal disser que a referência está
indisponível, confira se o servidor da web alcança `HTTP_REQUEST`.

## 10. Checklist do primeiro deploy

Na ordem. Marque cada item.

**GitHub**

- [ ] Branch `staging` criada a partir de `main` (seção 4).
- [ ] Environments `staging` e `production`. Produção com _Required
      reviewers_ e só a branch `main`.
- [ ] Secrets de repositório: `METADATA_BASE`, `API_REPO_READ_TOKEN`.
- [ ] Merge commit como único tipo de merge. Proteção de `main`.
- [ ] Secrets antigos apagados (lista em `variaveis-de-ambiente.md`).

**Primeiro build**

- [ ] Push em `staging` (o commit desta documentação basta). Acompanhe o
      `deploy.yml`: validate e browser-suites verdes, `build` publica
      `sha-<commit>` e `deploy-staging` move `staging`. Sem os secrets do
      Dokploy, o deploy aparece como "PULADO", e isso é esperado.
- [ ] Confira o pacote em github.com/orgs/Trajetto-Organization/packages:
      tags `sha-<commit>` e `staging`.

**API antes da web** (manual da API)

- [ ] API de staging no ar, com `/health/readiness` respondendo 200 e o
      `HTTP_REQUEST` da API = origem do staging da web.
- [ ] `RATE_LIMIT_FORWARDER_SECRET` gerado e colado nos dois lados.

**Dokploy: staging**

- [ ] Registry `ghcr.io` com o token `read:packages` (seção 5.1).
- [ ] Application `trajetto-ui` no project `trajetto-ui` do environment
      `staging` (seção 6): imagem `:staging`, Environment, domínio, Cluster
      e Swarm Settings, limite de memória, Auto Deploy.
- [ ] Rotação de log no `/etc/docker/daemon.json` do host (seção 18), se
      ainda não estiver lá.
- [ ] Deploy manual verde. `/api/health`, `/build-id.json` e `robots.txt`
      conferidos.
- [ ] Secrets `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_UI_APPLICATION_ID`
      e `METADATA_BASE_STAGING` no environment `staging` (seção 6.5).
- [ ] Novo push em `staging`: o job agora faz o deploy pela API do Dokploy
      e espera o `/build-id.json`. Run verde.
- [ ] CORS do bucket R2 de staging com a origem do staging.
- [ ] Turnstile: widget com o host de staging.

**Dokploy: produção**

- [ ] API de produção promovida primeiro.
- [ ] Application `trajetto-ui` no project `trajetto-ui` do environment
      `production` (seção 7), com imagem
      `:sha-<commit que está em staging>` neste primeiro deploy.
- [ ] Deploy manual verde e site conferido.
- [ ] Secrets `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_UI_APPLICATION_ID`
      (id da Application de produção), `API_DOCS_URL`, `DOCS_USER` e
      `DOCS_PASSWORD` no environment `production`.
- [ ] PR `staging` → `main`, merge commit, aprovação. O promote cria
      `stable`.
- [ ] Imagem da Application trocada para `:stable`.
- [ ] Redirect do apex e HSTS na Cloudflare ou no Traefik (seções 8 e 18).
      Exceção do WAF para `/build-id.json`.
- [ ] CORS do bucket R2 de produção com `https://www.intrajetto.com`.

## 11. Promover para produção

O caminho normal é o merge do PR `staging` → `main`. O job
`promote-production`:

1. **Espera a aprovação** do environment `production`. Nenhum passo roda
   antes.
2. **Descobre o commit de staging:**
   - merge commit (dois pais): o **segundo pai** é o commit de `staging` que
     foi mergeado;
   - fast-forward (um pai): o próprio commit de `main`;
   - se o merge tiver conteúdo diferente do commit de staging (fora o
     `CHANGELOG.md`), **falha**: main tem mudança que não passou por
     staging.
3. **Acha o build que o staging serviu** para esse commit
   (`.github/scripts/staged-build.mjs`), pela tag `staged-<commit>`. Ela é
   gravada pelo `deploy-staging` como último passo, então só existe para um
   build que passou no Trivy, virou a tag `staging` e (com a conferência
   ligada) foi servido pelo site de staging. A imagem `sha-<commit>`
   sozinha não basta: ela vai para o GHCR antes do scan e fica lá quando o
   scan, o rollout de staging ou o run falha.
   - **O run de staging desse commit ainda está rodando** (o merge chegou
     antes de ele terminar): o promote espera ele terminar, até 120 min,
     lendo o run pela API do GitHub, e confere o marcador de novo (decisão
     D10). Antes, o promote falhava e a doc mandava dar _Re-run_.
   - **O commit nunca rodou no staging** (um `[skip ci]`, seção 2): o
     promote volta pela história de `staging` até o commit mais próximo com
     `staged-<commit>` e promove o build dele, **se** tudo entre os dois for
     documentação (`*.md` e `docs/`, que a imagem não contém). Se houver
     qualquer outra mudança, falha listando os arquivos: ela nunca passou
     pelo pipeline (decisão D11). Um merge com squash ou rebase cria um
     commit que o staging nunca construiu, com código; cai aqui e é recusado
     do mesmo jeito.
   - **O run de staging terminou sem o marcador** (falhou, ou foi superado
     por um commit mais novo antes do deploy): falha, com o link do run. O
     staging nunca serviu esse build.
4. **Valida a tag** (`sha-<sha>` ou `main-<sha>`) e lê o **digest** dela
   no GHCR, e o commit de origem pelo rótulo da imagem, direto do registry,
   sem baixar a imagem. Se a imagem não existir, falha com a explicação.
   **Num merge**, exige também `staged-<commit>` no **mesmo digest**. Toda
   consulta ao GHCR passa pelo `ghcr.mjs`: "a tag não existe" é resposta;
   um erro de transporte é repetido e, se persistir, falha dizendo que foi o
   GHCR. O **Run workflow** (rollback) não exige o marcador: ele aponta para
   builds antigos, alguns de antes do marcador existir, e a tag digitada
   passa pela aprovação do environment.
5. **Gate de rotas:** faz checkout do código daquele build em `promoted/` e
   roda `node scripts/check-api-routes.mjs promoted/src` contra
   `API_DOCS_URL`. Se faltar rota, ou se a leitura falhar por rede ou 5xx,
   lê de novo a cada 30 s por até 10 min (a API pode estar no meio do rolling,
   com uma réplica antiga respondendo o `/docs/json`). Só no fim do prazo
   falha, listando as rotas que ainda faltam. Uma leitura recusada (401, 403, 404) é configuração e falha na hora. Sem `API_DOCS_URL`, é pulado com
   aviso.
6. **Move `stable`** para o digest, do lado do servidor
   (`docker buildx imagetools create`, pelo `ghcr.mjs`), sem pull nem
   rebuild.
7. **Deploy pela API do Dokploy** da Application de produção, com até 6
   tentativas se o deployment terminar em erro. Sem os secrets, é pulado com
   aviso.
8. **Espera** `https://www.intrajetto.com/build-id.json` responder o commit
   promovido por 90 s seguidos. Se o Swarm reverter (health check falhou), o
   run falha.
9. O job `release` cria a versão.

O resumo do run mostra o digest promovido. Guarde-o para um rollback.

## 12. Rollback

**Pelo workflow (o caminho certo):**

1. Descubra a tag boa: no resumo de um promote anterior (linha
   `trajetto-ui:stable → sha-… (sha256:…)`), ou na lista de versões do
   pacote no GHCR.
2. GitHub → Actions → **Deploy** → **Run workflow** → branch **`main`** →
   `image_tag` = `sha-<commit bom>` (ou `main-<sha>` de um build antigo).
3. Aprove o environment `production`. O job valida a tag, roda o gate de
   rotas contra o código daquele build, move `stable` para o digest dele,
   faz o deploy no Dokploy e espera o `/build-id.json`.

**Pelo Dokploy (se o GitHub estiver fora):** na Application de produção,
troque a imagem para `ghcr.io/trajetto-organization/trajetto-ui:sha-<commit bom>`
e clique em **Deploy**. Depois que o GitHub voltar, rode o rollback pelo
workflow, para `stable` refletir o que roda, e volte a imagem da Application
para `:stable`.

**Emergência no host:** `docker service rollback <App Name da Application>`
volta para a spec anterior do Swarm na hora.

**Rollback para um build sem `/build-id.json`** (anterior a essa rota): a
espera falha com 404 até o prazo. Defina a variável de repositório
`ROLLOUT_VERIFY=off` só durante esse rollback, confira à mão
(`docker service ps --no-trunc <App Name>`) e apague a variável depois.

Abas abertas durante um rollback recebem o aviso "Uma nova versão do
Trajetto foi publicada", como em qualquer deploy (`arquitetura.md`).

## 13. Ordem entre web e API

**API primeiro, web depois.** As duas são promovidas por pipelines
diferentes, e nada entre elas garante a ordem.

1. **API:** promova a `trajetto-api` e espere as réplicas convergirem
   (`/health/readiness` 200 em todas). Durante o rolling, o `/docs/json`
   pode vir de qualquer réplica.
2. **Web:** só então faça o merge `staging` → `main` da web. Se a API ainda
   está convergindo, o gate de rotas espera até 10 min, lendo o `/docs/json`
   de novo. Se a API não foi promovida, o gate **falha** no fim do prazo e
   lista as rotas que faltam. Nada é promovido: é o gate funcionando, não
   instabilidade. Promova a API e rode o job do promote de novo.

Mudanças de rota seguem **expandir e depois contrair** (detalhes em
`arquitetura.md`): a API nunca tira, no mesmo release, uma rota que a web em
produção ainda usa. Uma rota aposentada responde `410 ENDPOINT_RETIRED`.

## 14. Conferir depois de cada deploy

```sh
# Qual build está no ar
curl -s https://www.intrajetto.com/build-id.json        # {"sha":"<commit promovido>"}

# Saúde do contêiner (o mesmo que o health check usa)
curl -s https://www.intrajetto.com/api/health           # {"status":"ok",...}

# Staging nunca indexado
curl -s https://staging.intrajetto.com/robots.txt       # Disallow: /

# O gate de rotas, à mão (mesmas variáveis do job)
API_DOCS_URL=https://<API de produção>/docs/json DOCS_USER=... DOCS_PASSWORD=... \
  node scripts/check-api-routes.mjs
```

No staging, antes de abrir o PR para `main`:

1. Login com captcha, 2FA e recuperação de senha.
2. Uma tela de Frotas e uma de Entregas carregando dados. Torre de controle
   com mapa de fundo (`MAP_TILE_URL`).
3. Upload de uma foto (prova o CORS do R2 e a CSP).
4. Tempo real: uma mudança numa aba aparece na outra.
5. `/docs/referencia` com a referência carregada.
6. Log da Application sem linhas `[env]`, sem `[csp-report]` novas e sem
   erros de boot.

## 15. CSP e relatórios de violação

A CSP é **aplicada** (cabeçalho `Content-Security-Policy`, não Report-Only),
montada por requisição pelo `middleware.ts`, com nonce nas páginas dinâmicas
(detalhes em `arquitetura.md`). Cada violação que um navegador bloqueia é
enviada para `report-uri /api/csp-report` e vira **uma** linha
`console.error` no log do contêiner (no máximo 60 por minuto por instância,
sem query string e sem token do caminho).

Depois de cada deploy, procure no log da Application (Dokploy → Logs) por
`csp`:

- **Uma origem nova legítima bloqueada** (um provedor de tiles, outro
  bucket): ajuste a variável certa (`MAP_TILE_URL`, `CSP_STORAGE_ORIGINS`,
  `PUBLIC_API_URL`) e faça um Redeploy. Não é preciso build.
- **Script inline bloqueado numa página dinâmica:** é bug da página. Abra
  uma issue com a linha do log.
- **Origens estranhas** (extensões de navegador, `chrome-extension://`):
  ruído, ignore.

## 16. Suítes de navegador no pipeline

O `browser-suites.yml` roda num push em `staging` (antes do build), num PR
para `main` e sob demanda. Ele precisa do secret de repositório
`API_REPO_READ_TOKEN`: um token fine-grained com dono
`Trajetto-Organization`, acesso só ao repositório `trajetto-api` e
_Contents: Read-only_. Sem o token, as suítes são **puladas** com um aviso no
resumo do run, e o deploy segue. Crie o token assim que puder: sem ele, o
deploy não roda as suítes de tela.

Ele faz checkout da `trajetto-api` na mesma branch (`staging` num push em
staging; a branch de origem num PR). Por isso, mantenha a `staging` da API
compatível com a `staging` da web.

Toda corrida terminada (verde ou vermelha) publica o artefato
`browser-suites-<run id>`, com os traces de cada suíte (`test-results/ui`,
`test-results/a11y`, `test-results/responsive`) e os logs da API e da web.
De um teste que só passou na nova tentativa fica o trace da primeira
tentativa. Ele também vira um aviso no run e uma linha no resumo
(`testes.md`, "Testes instáveis"). Uma falha do serviço de artefatos não
reprova o job.

## 17. Recursos, logs e retenção de imagens

**Memória:** a web usa 768 MiB de limite e 512 MB de heap. Ela divide a VPS
com a API (2 × 1024 MiB), o Postgres, o Redis (512 MiB),
o `trajetto-ai` (1024 MiB e 2 CPUs), o Dokploy e o Traefik. Com staging no
mesmo host, o total dobra, ou o staging usa limites menores.

**Logs:** o Dokploy não define a rotação de log da Application. Ela é
configurada uma vez no host (seção 18). Sem isso, o log cresce até encher o
disco do nó, o mesmo nó onde mora o volume do banco.

**Retenção no GHCR:** cada push em `staging` publica um `sha-<commit>`, e o
deploy de staging bem-sucedido acrescenta `staged-<commit>` no mesmo
digest. Não há limpeza automática. As versões sem tag incluem os manifestos de atestado
(SBOM e proveniência) e os índices que `stable` e `staging` usam, e
apagá-las às cegas quebra imagens com tag. Limpe à mão, pelo painel do
pacote, só as `sha-*`, `staged-*` e `main-*` antigas que não são `stable`
nem `staging`. Apagar o `staged-<commit>` de um build impede um merge dele
em `main` (o rollback pelo Run workflow continua funcionando).
Mantenha pelo menos as dos últimos releases, para rollback.

**Trivy:** o scan relata vulnerabilidades CRITICAL com correção em todo
build. Quando a base `node:22.21.1-alpine` estiver limpa, defina
`IMAGE_SCAN_ENFORCE=true` para o scan falhar o build. O scan lê a imagem
por digest, então `sha-<commit>` já está no GHCR quando ele falha. O que
segura a produção é o marcador: com o build vermelho, o `deploy-staging`
não roda, o build não ganha `staged-<commit>`, e um merge dele em `main` é
recusado no promote (seção 11). Um rollback manual pelo Run workflow para
essa tag ainda seria aceito, então não use uma tag cujo build falhou no
scan.

O banco de vulnerabilidades do Trivy fica em cache entre corridas
(`actions/cache`, uma chave por dia e pela versão do Trivy), e o download
tem três tentativas (decisão D6). Se todas falharem, o scan usa a cópia do
cache e o resumo diz de quando ela é. O resumo do run separa os três
desfechos: **falha no download do banco**, **achados** e **o scan falhou**
(erro do Trivy ou do GHCR). Só os achados são vulnerabilidade. Com
`IMAGE_SCAN_ENFORCE=true`, só os achados reprovam o build; um scan que não
conseguiu rodar (sem banco, Trivy ou GHCR com erro) vira aviso e linha no
resumo, como na `trajetto-api`: vermelho é defeito do commit, e um registry
fora do ar não é.

**Pendência com data: 31/12/2026.** As três linhas do `.trivyignore` (e as
mesmas três exceções do `audit-ci.jsonc`) vencem nesse dia. Depois dele, o
Trivy volta a contar esses avisos; com `IMAGE_SCAN_ENFORCE=true`, todo build
falharia. Antes da data: migre o Next (a saída planejada em
`arquitetura.md`, "Next.js 14: versão e avisos de segurança") e apague as
linhas, ou revise cada exceção e mova a data, com o motivo.

## 18. O que a Application não cobre: Traefik, logs e encerramento

O compose de produção, que não existe mais, fazia algumas coisas que o
formulário da Application não tem. Cada uma tem o seu lugar:

| O que o compose fazia                              | Onde fica agora                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| health check, update e rollback, restart, réplicas | Advanced → Cluster Settings e Swarm Settings (seção 6.4)                                  |
| limite de memória e heap do Node                   | Advanced → Resources e `NODE_OPTIONS` no Environment (seções 6.2 e 6.4)                   |
| roteador do `www` (host, porta 3000, TLS)          | aba Domains (seção 6.3)                                                                   |
| HSTS e cabeçalhos de segurança no `www`            | o próprio Next (`next.config.mjs` e `middleware.ts`), em toda resposta. Nada a configurar |
| compressão                                         | o próprio Next (`compress: true`). Nada a configurar no Traefik                           |
| redirect do domínio sem www com HSTS               | Cloudflare (seção 8) **ou** o arquivo do Traefik abaixo                                   |
| rotação de log `json-file` (50 MB × 5)             | `/etc/docker/daemon.json` do host, abaixo                                                 |
| `stop_grace_period: 30s`                           | sem campo na Application: o Swarm usa o padrão de 10 s (veja abaixo)                      |

**Redirect do domínio sem www no Traefik** (produção; no staging, só se
quiser testar com um segundo host). Crie um arquivo **separado** do que o
Dokploy gera para a Application, para ele não ser reescrito quando você
mexer na aba Domains. Pelo painel: **Settings → Web Server → Traefik → File
System** (o nome varia entre versões), pasta `dynamic`, novo arquivo
`trajetto-ui-production-apex.yml`. Ou direto no host, em
`/etc/dokploy/traefik/dynamic/trajetto-ui-production-apex.yml`. O Traefik
lê a pasta sozinho, sem reinício.

```yaml
http:
  routers:
    trajetto-ui-production-apex:
      rule: Host(`intrajetto.com`)
      entryPoints:
        - websecure
      # HSTS first, then the redirect: the 301 itself carries the header.
      middlewares:
        - trajetto-ui-production-apex-hsts
        - trajetto-ui-production-to-canonical
      # Nothing is proxied: the redirect answers before any backend.
      service: noop@internal
      tls:
        certResolver: letsencrypt
  middlewares:
    trajetto-ui-production-apex-hsts:
      headers:
        stsSeconds: 63072000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
    trajetto-ui-production-to-canonical:
      redirectRegex:
        regex: "^https?://[^/]+/(.*)"
        replacement: "https://www.intrajetto.com/${1}"
        permanent: true
```

- Os nomes levam o ambiente (`-production-`): staging e produção dividem o
  mesmo Traefik, e dois roteadores ou middlewares com o mesmo nome fazem o
  Traefik descartar os dois. Para o staging, troque `production` por
  `staging` e os dois hosts.
- O redirect de :80 para :443 é global e vem de
  `trajetto-api/infra/traefik/`; este arquivo só cobre o `websecure`.
- `letsencrypt` é o resolver padrão do Dokploy. Com a Cloudflare em _Full
  (strict)_ na frente, o certificado do apex é emitido como o do `www`.
- Não ligue os dois redirects ao mesmo tempo: com a regra da Cloudflare
  ativa, o pedido nunca chega a este roteador. O HSTS da Cloudflare e o
  deste arquivo podem coexistir.
- Confira com os mesmos `curl -sI` da seção 8.

**Rotação de log** (uma vez por host, numa janela de manutenção: reiniciar
o Docker reinicia todos os serviços). Em `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
```

Depois, `systemctl restart docker`. A regra vale para contêineres criados a
partir daí: faça um Redeploy de cada Application para os serviços já em pé
passarem a rotacionar.

**Encerramento:** o compose dava 30 s entre o SIGTERM e o SIGKILL. O
formulário da Application não tem esse campo, e o Swarm usa 10 s. Para a web
isso basta: ela não tem fila nem estado, e com `start-first` a task nova já
está saudável e recebendo tráfego antes de a velha receber o SIGTERM. Se
precisar dos 30 s, `docker service update --stop-grace-period 30s <App Name>`
no host vale até o próximo deploy do Dokploy, que recria a spec sem ele.

## 19. Solução de problemas

| Sintoma                                                         | Causa provável                                                                                                | O que fazer                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Deploy "PULADO" no resumo                                       | secrets `DOKPLOY_URL`, `DOKPLOY_API_KEY` e `DOKPLOY_UI_APPLICATION_ID` ausentes                               | crie os três no environment certo (seção 6.5)                                              |
| `O Dokploy recusou o deploy`: HTTP 401/404                      | chave revogada, id errado ou Application recriada (o id mudou)                                                | gere a chave ou copie o id de novo e atualize o secret                                     |
| `terminou em 'error' … depois de 6 tentativas`                  | imagem que não baixa (credencial do GHCR, rede da VPS) ou spec recusada                                       | veja o log do deployment no painel (aba Deployments da Application)                        |
| `A imagem … não existe no GHCR` no promote                      | merge com squash ou rebase, ou commit que não passou por staging                                              | refaça como merge commit, ou rode o workflow com um `image_tag` existente                  |
| `O merge … difere do commit de staging`                         | commit direto em `main`                                                                                       | leve a mudança para `staging`, espere o deploy e faça o merge de novo                      |
| `… não rodou no staging, e a diferença … não é só documentação` | um commit com código foi para `staging` com `[skip ci]` (ou um squash)                                        | leve a mudança para `staging` sem `[skip ci]`, espere o deploy e faça o merge de novo      |
| `… rodou no staging (…), mas não tem o marcador`                | o run de staging daquele commit falhou ou foi superado antes do deploy                                        | corrija em `staging` (o link do run está na mensagem) e faça o merge de novo               |
| Promote parado em `O run de staging … ainda está em andamento`  | o merge chegou antes de o staging terminar                                                                    | nada: ele espera o run terminar (até 120 min) e segue sozinho                              |
| `O GHCR não respondeu sobre …` / `O GHCR recusou o acesso`      | o registry ficou fora mais que as 4 tentativas / login ou permissão `packages`                                | veja o status do GitHub / confira o `GITHUB_TOKEN` e o acesso do pacote (seção 4)          |
| Gate de rotas lista rotas faltando                              | web promovida antes da API (o gate já esperou 10 min)                                                         | promova a API e rode o job do promote de novo                                              |
| `git ls-remote não conseguiu consultar trajetto-api`            | rede ou `API_REPO_READ_TOKEN` vencido ou sem acesso                                                           | confira o token (seção 16); se for rede, o run seguinte passa                              |
| Aviso `Audit de dependências: aviso (não bloqueia)`             | aviso novo numa dependência de produção, num push que não mexeu em dependência                                | atualize a dependência (PR do Dependabot) ou registre a exceção datada em `audit-ci.jsonc` |
| `Trivy: falha no download do banco` no resumo                   | a fonte do banco do Trivy fora do ar e sem cópia em cache                                                     | nada a corrigir no código; a próxima corrida baixa de novo                                 |
| `/build-id.json` com 403 no run                                 | WAF ou bot fight da Cloudflare                                                                                | exceção para `/build-id.json`                                                              |
| Run falha esperando o build e o site serve o antigo             | o Swarm reverteu: o health check falhou                                                                       | veja o log da Application (variável faltando lista os nomes)                               |
| O servidor não sobe e lista variáveis                           | obrigatória faltando ou inválida                                                                              | compare com `variaveis-de-ambiente.md`                                                     |
| Dokploy não puxa a imagem (`unauthorized`)                      | token do GHCR vencido ou sem `read:packages`                                                                  | gere outro e atualize o registry                                                           |
| Toda chamada falha com erro de rede                             | API fora do ar ou `HTTP_REQUEST`/`PUBLIC_API_URL` errados                                                     | confira as duas URLs e a API                                                               |
| Login funciona e o tempo real não                               | `PUBLIC_API_URL` (o socket conecta nela) ou CORS da API (o `HTTP_REQUEST` da API deve ser a origem desta web) | confira as duas pontas                                                                     |
| 429 no login para todo mundo                                    | `RATE_LIMIT_FORWARDER_SECRET` diferente da API                                                                | use o mesmo valor nos dois lados                                                           |
| Upload recusado pelo navegador                                  | CORS do bucket ou origem fora da CSP                                                                          | regra CORS do R2 e `CSP_STORAGE_ORIGINS`                                                   |
| Mapa sem fundo em staging ou produção                           | `MAP_TILE_URL` vazio                                                                                          | configure um provedor de tiles comercial                                                   |
| Staging aparecendo no Google                                    | `APP_ENV` diferente de `staging`                                                                              | corrija e faça Redeploy. Peça remoção no Search Console                                    |
| Tela 404 logo depois de promover                                | web publicada antes da API                                                                                    | promova a API                                                                              |
| Suítes de navegador puladas                                     | falta `API_REPO_READ_TOKEN`                                                                                   | crie o token (seção 16)                                                                    |

## 20. Os três repositórios juntos

> Esta seção é **a mesma** nos três manuais de deploy:
> [`trajetto-api/docs/deploy.md`](https://github.com/Trajetto-Organization/trajetto-api/blob/main/docs/deploy.md),
> [`trajetto-ui/docs/deploy.md`](https://github.com/Trajetto-Organization/trajetto-ui/blob/main/docs/deploy.md)
> e
> [`trajetto-mobile/docs/deploy.md`](https://github.com/Trajetto-Organization/trajetto-mobile/blob/main/docs/deploy.md).
> Mudou aqui, mude nos outros dois. O detalhe de cada passo fica no manual do
> repositório dono dele. O que foi configurado à mão nos painéis (Contabo,
> Dokploy, Cloudflare, GitHub, Expo, Resend e R2), os tokens e o porquê de cada
> escolha ficam em
> [`trajetto-api/docs/infraestrutura.md`](https://github.com/Trajetto-Organization/trajetto-api/blob/staging/docs/infraestrutura.md).

### Quem é quem

|                             | API (`Trajetto-Organization/trajetto-api`)                                                                                                                                                                                                                                                                                                   | Web (`Trajetto-Organization/trajetto-ui`)                                                                                                                                                                       | App (`Trajetto-Organization/trajetto-mobile`)                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Artefato                    | imagens `trajetto-api` e `trajetto-ai` em `ghcr.io/trajetto-organization/`                                                                                                                                                                                                                                                                   | imagem `ghcr.io/trajetto-organization/trajetto-ui`                                                                                                                                                              | APK/AAB (EAS Build) e OTA (EAS Update)                                                                          |
| Onde roda                   | Dokploy, projeto `trajetto-api` de cada environment (`staging` e `production`): as Applications `trajetto-api` (2 réplicas, com domínio) e `trajetto-ai` (sem domínio), puxando as imagens do GHCR, e os Databases PostgreSQL (com o backup diário do próprio Dokploy para o Cloudflare R2) e Redis                                          | Dokploy, projeto `trajetto-ui` de cada environment: a Application `trajetto-ui`, puxando a imagem do GHCR                                                                                                       | no celular do motorista (APK interno em staging, Play Store em produção)                                        |
| Nome no Dokploy / EAS       | App Names `trajetto-api-staging` e `trajetto-api-production` (e `trajetto-ai-*`, `trajetto-postgres-*`, `trajetto-redis-*`)                                                                                                                                                                                                                  | Application `trajetto-ui` no projeto `trajetto-ui` de cada environment (App Names `trajetto-ui-staging` e `trajetto-ui-production`)                                                                             | perfis, ambientes e canais `staging` e `production`                                                             |
| Como o pipeline publica     | API do Dokploy (`.github/scripts/dokploy-deploy.mjs`): `application.deploy` de cada Application, na ordem IA → API, a IA só quando o digest muda, acompanhando cada deployment até o fim e disparando de novo, até 6 vezes e com espera crescente, o que termina em erro; depois espera a `/health/liveness` pública responder o commit novo | API do Dokploy com o **mesmo** `.github/scripts/dokploy-deploy.mjs` (cópia comparada por teste): `application.deploy` da Application `trajetto-ui`, acompanhando o deployment, depois espera o `/build-id.json` | `eas update` e `eas build`                                                                                      |
| Secrets de deploy no GitHub | environments `staging` e `production`: `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_API_APPLICATION_ID` (obrigatórios) e `DOKPLOY_AI_APPLICATION_ID` (opcional); variáveis `API_PUBLIC_URL` (a conferência pela liveness) e `SWARM_API_SERVICE` (a conferência por SSH)                                                                        | environments `staging` e `production`: `DOKPLOY_URL`, `DOKPLOY_API_KEY` e `DOKPLOY_UI_APPLICATION_ID`                                                                                                           | `EXPO_TOKEN` (repositório) e `EXPO_UPDATE_PRIVATE_KEY` (environments `staging` e `production`)                  |
| Sem os secrets              | move as tags e pula o deploy com `::notice::`                                                                                                                                                                                                                                                                                                | move as tags e pula o deploy com aviso                                                                                                                                                                          | termina verde com aviso, sem publicar                                                                           |
| De staging para produção    | promove por digest a imagem `sha-<7 do commit>` (tag `staging` → `stable`), sem rebuild, e exige o marcador `staged-<7 do commit>` no mesmo digest                                                                                                                                                                                           | igual à API, e exige o marcador `staged-<7 do commit>` no mesmo digest                                                                                                                                          | promove o **commit** verde em staging (a URL da API é embutida no build, então o artefato não pode ser o mesmo) |
| Rollback                    | _Run workflow_ do `deploy.yml` com `image_tag=sha-<7>`                                                                                                                                                                                                                                                                                       | _Run workflow_ do `deploy.yml` com `image_tag=sha-<7>`                                                                                                                                                          | `ota-rollback.yml` (republica um grupo de OTA)                                                                  |

Regras comuns aos três: a branch `staging` recebe o trabalho (push direto do
dono ou merge de PR) e todo push nela roda a validação completa e publica o
staging; `main` só recebe PR **de `staging`**, com **merge commit** (squash e
rebase criam um commit que o staging nunca validou, e a promoção recusa); o
environment `production` do GitHub tem **Required reviewers** e
_Deployment branches_ restrito a `main`, então nada chega à produção sem
aprovação. No Dokploy, as imagens privadas do GHCR são puxadas com um token
_classic_ `read:packages`, informado no provider Docker de cada Application.

### Endereços

|                        | Staging                                                                           | Produção                                                           |
| ---------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Web                    | `https://staging.intrajetto.com`                                                  | `https://www.intrajetto.com` (o apex `intrajetto.com` redireciona) |
| API (REST e Socket.IO) | `https://api-staging.intrajetto.com`                                              | a definir, ex. `https://api.intrajetto.com`                        |
| Serviço de IA          | sem endereço público: `http://trajetto-ai-staging:8080` na rede `dokploy-network` | sem endereço público: `http://trajetto-ai-production:8080`         |

### O que precisa casar entre os repositórios

| Valor                             | API (Environment das Applications do projeto `trajetto-api`)                                                                                    | Web (Environment da Application)                                                         | App (ambiente EAS)                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| URL pública da API                | o host na aba _Domains_ da Application `trajetto-api` e `API_HTTP_REQUEST` (a URL; dela sai o logo dos e-mails)                                 | `HTTP_REQUEST` (chamadas do servidor da web) e `PUBLIC_API_URL` (chamadas do navegador)  | `EXPO_PUBLIC_API_URL`                                                                 |
| Socket.IO                         | o mesmo host da API, com WebSocket liberado na borda                                                                                            | `PUBLIC_API_URL` (o socket roda na própria API; não há variável própria)                 | o socket usa `EXPO_PUBLIC_API_URL`                                                    |
| Origem da web                     | `HTTP_REQUEST` = a origem da web do ambiente (única origem do CORS e do Socket.IO, base dos links)                                              | `METADATA_BASE`                                                                          | `EXPO_PUBLIC_WEB_APPLICATION_URL` (links de Privacidade e Termos)                     |
| Limite de tentativas por IP       | `RATE_LIMIT_FORWARDER_SECRET`                                                                                                                   | `RATE_LIMIT_FORWARDER_SECRET`, **o mesmo valor**                                         | —                                                                                     |
| Captcha (Turnstile)               | `TURNSTILE_SECRET_KEY` (o mesmo widget da web; definida, exige o token)                                                                         | `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`                                            | —                                                                                     |
| Fotos no R2                       | `R2_*` (um bucket por ambiente)                                                                                                                 | `CSP_STORAGE_ORIGINS` libera a origem do bucket; o CORS do bucket libera a origem da web | envia direto à URL pré-assinada que a API devolve (sem configuração)                  |
| IA (leitura de fotos)             | `AI_LOCAL_TOKEN` na `trajetto-api` = `AI_TOKEN` na `trajetto-ai` (o mesmo valor, um por ambiente) e `AI_LOCAL_URL=http://<App Name da IA>:8080` | nenhuma variável: a IA chega pela API                                                    | nenhuma variável                                                                      |
| Push (FCM)                        | nenhuma: a API chama a Expo Push API                                                                                                            | —                                                                                        | `GOOGLE_SERVICES_JSON` (arquivo secreto no EAS) e a chave FCM V1 em `eas credentials` |
| Rastreamento em segundo plano     | —                                                                                                                                               | `BACKGROUND_TRACKING`                                                                    | `EXPO_PUBLIC_BACKGROUND_TRACKING` (as duas ligam juntas)                              |
| Versão do app                     | `MIN_MOBILE_CONTRACT` e `MOBILE_STORE_URL`                                                                                                      | —                                                                                        | `CLIENT_CONTRACT` em `utils/client-version.ts`                                        |
| Gate de rotas da web              | `/docs/json` com `DOCS_USER` e `DOCS_PASSWORD`                                                                                                  | secrets `API_DOCS_URL`, `DOCS_USER`, `DOCS_PASSWORD` no environment `production`         | —                                                                                     |
| Checkout entre repositórios no CI | `CLIENT_REPOS_READ_TOKEN` (lê a web e o app)                                                                                                    | `API_REPO_READ_TOKEN` (lê a API)                                                         | `API_REPO_READ_TOKEN` (lê a API)                                                      |

Segredos nunca são compartilhados entre staging e produção. Cada variável
está detalhada no `docs/variaveis-de-ambiente.md` do repositório que a lê.

### Ordem do primeiro deploy

1. **GitHub, nos três repositórios:** branch `staging` criada a partir de
   `main`; environments `staging` e `production` (este com revisores e só a
   branch `main`); só merge commit habilitado; proteção de `main`. Um
   primeiro push em `staging` em cada repositório: a API e a web publicam
   `sha-<7>` no GHCR e pulam o deploy; o app pula o EAS até o `EXPO_TOKEN`
   existir.
2. **Servidor:** VPS com Dokploy, rotação de log no `/etc/docker/daemon.json`,
   Traefik ajustado com `trajetto-api/infra/traefik/`, DNS na Cloudflare (Full
   strict) para os hosts da web e da API, e um token _classic_
   `read:packages` do GHCR (o mesmo serve para as três imagens: API, IA e web).
3. **Contas externas:** buckets R2 de fotos (um por ambiente, CORS com a
   origem da web) e de backup do banco (`trajetto-backups`, com um prefixo
   por ambiente; recomendado um bucket próprio para produção,
   `trajetto-backups-prod`), widgets do Turnstile por ambiente, Meta e
   Resend (de teste em staging), heartbeats de monitoramento.
4. **API de staging** (manual da API), no projeto `trajetto-api` do
   environment `staging`, nesta ordem e conferindo cada um: Databases
   **PostgreSQL** e **Redis**; Application **`trajetto-ai`** (com o
   `AI_TOKEN`); Application **`trajetto-api`** (com `AI_LOCAL_TOKEN` igual,
   `AI_LOCAL_URL` apontando para a IA e as URLs do banco e do Redis); o
   **backup** na aba _Backups_ do Database PostgreSQL (destino S3 no R2,
   diário). Confira `/health/readiness` e, como
   MASTER na web, _Sistema → Provedores_. Depois, os secrets `DOKPLOY_*` e a
   variável `API_PUBLIC_URL` no environment `staging` da API.
5. **Web de staging** (Application `trajetto-ui` do projeto `trajetto-ui` no
   environment `staging`, manual da web): imagem
   `:staging`, `HTTP_REQUEST` e `PUBLIC_API_URL` apontando para a API de
   staging, o mesmo `RATE_LIMIT_FORWARDER_SECRET` da API de staging, e o
   `HTTP_REQUEST` da API de staging igual à origem da web de staging. Depois,
   `DOKPLOY_URL`, `DOKPLOY_API_KEY` (a mesma chave da API serve),
   `DOKPLOY_UI_APPLICATION_ID` e `METADATA_BASE_STAGING` no environment
   `staging` da web.
6. **App de staging** (manual do app): ambiente EAS `preview` (o EAS não
   tem ambiente `staging`; o perfil `staging` lê o `preview`) com
   `EXPO_PUBLIC_API_URL` = API de staging e
   `EXPO_PUBLIC_WEB_APPLICATION_URL` = web de staging; `EXPO_TOKEN` no
   GitHub; um push em `staging` gera o APK de staging.
7. **Produção, na mesma ordem:** a tag `stable` da API criada antes (_Run
   workflow_ do `deploy.yml` da API com `image_tag=sha-<7>`, enquanto o
   environment `production` ainda não tem os secrets do Dokploy); as mesmas
   peças (Databases com o backup, IA e API) no projeto `trajetto-api` do
   environment `production`, já em `:stable`; os secrets de produção e o PR `staging → main` da API; depois a
   Application `trajetto-ui` do environment `production` e o PR da web; por último o PR do
   app, que gera o AAB de produção apontando para a API de produção.

### Ordem de cada release

**API → web → app**, sempre:

1. **API:** merge `staging → main`, aprovação, convergência das réplicas.
   Mudanças de rota seguem expandir e depois contrair: a API nunca tira uma
   rota que a web ou o app em produção ainda chamam.
2. **Web:** só depois. O gate de rotas do promote falha se a API de
   produção ainda não serve alguma rota que o build da web chama.
3. **App:** por último. Se o app passou a enviar algo novo, o
   `CLIENT_CONTRACT` (`utils/client-version.ts`) sobe e a API compatível já
   precisa estar em produção; `MIN_MOBILE_CONTRACT` só sobe depois que a OTA
   (ou o binário) com o contrato novo estiver publicada e os contratos
   antigos sumirem dos logs da API.
