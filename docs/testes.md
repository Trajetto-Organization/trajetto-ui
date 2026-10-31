# Testes da web (`trajetto-ui`)

Este documento explica como os testes deste repositório são organizados, como
rodar cada suíte, o que cada uma prova e quais regras um teste novo segue.
Ele foi escrito para alguém que acabou de abrir o projeto, pessoa ou agente
de IA.

## Sumário

- [Resumo em uma tabela](#resumo-em-uma-tabela)
- [Comandos](#comandos)
- [Unitários (Vitest)](#unitários-vitest)
- [Regras no runner do Playwright (`tests/E2E`)](#regras-no-runner-do-playwright-testse2e)
- [Suítes de navegador contra a stack (`ui`, `a11y`, `responsive`)](#suítes-de-navegador-contra-a-stack-ui-a11y-responsive)
- [Cobertura](#cobertura)
- [Mutação (Stryker)](#mutação-stryker)
- [Onde cada suíte roda no CI](#onde-cada-suíte-roda-no-ci)
- [Testes que guardam a infraestrutura e a documentação](#testes-que-guardam-a-infraestrutura-e-a-documentação)
- [Testes que leem os repositórios irmãos](#testes-que-leem-os-repositórios-irmãos)
- [Regras para escrever um teste](#regras-para-escrever-um-teste)
- [Windows](#windows)
- [Solução de problemas](#solução-de-problemas)

## Resumo em uma tabela

| Suíte                                             | Pasta              | Config                            | Comando                                                  | Precisa de                                  | No CI                                                             |
| ------------------------------------------------- | ------------------ | --------------------------------- | -------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Unitários (componentes, regras, actions, configs) | `tests/unitaires`  | `vitest.config.ts`                | `yarn test:unit`                                         | nada (happy-dom)                            | todo push e PR (`ci.yml`)                                         |
| Regras no runner do Playwright                    | `tests/E2E`        | `playwright.config.ts`            | `yarn test:rules`                                        | nada, sem navegador                         | todo push e PR (`ci.yml`)                                         |
| Interface contra a stack                          | `tests/ui`         | `playwright.ui.config.ts`         | `npx playwright test -c playwright.ui.config.ts`         | API em `:3334`, web em `:3100`, seed da API | push em staging, PR para main, sob demanda (`browser-suites.yml`) |
| Acessibilidade (axe)                              | `tests/a11y`       | `playwright.a11y.config.ts`       | `npx playwright test -c playwright.a11y.config.ts`       | idem                                        | idem                                                              |
| Responsivo (320 a 1920 px)                        | `tests/responsive` | `playwright.responsive.config.ts` | `npx playwright test -c playwright.responsive.config.ts` | idem                                        | idem                                                              |
| Mutação                                           | regras críticas    | `stryker.config.mjs`              | `yarn test:mutation`                                     | nada (lento)                                | não roda no CI                                                    |

## Comandos

Todos os scripts estão no `package.json`:

| Script                                                   | O que faz                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `yarn test:unit`                                         | Vitest uma vez, em `tests/unitaires`                                                                            |
| `yarn test:unit:watch`                                   | Vitest em modo watch                                                                                            |
| `yarn test:unit:coverage`                                | Vitest com cobertura (relatório em `coverage/`)                                                                 |
| `yarn test:rules`                                        | Playwright em `tests/E2E`, só o projeto `chromium`, reporter `list`                                             |
| `yarn test`                                              | Playwright em `tests/E2E` nos três navegadores (Chromium, Firefox, WebKit). Precisa de `npx playwright install` |
| `yarn test:headed` / `yarn test:ui` / `yarn test:report` | Playwright com navegador visível, modo interativo e relatório HTML                                              |
| `yarn test:mutation`                                     | Stryker                                                                                                         |
| `yarn typecheck`                                         | `tsc --noEmit`                                                                                                  |
| `yarn lint:check` / `yarn lint:fix`                      | Prettier (`yarn lint` é o ESLint do Next)                                                                       |

Rodar um arquivo ou um filtro:

```bash
npx vitest run --dir tests/unitaires deploy-promotion
npx vitest run tests/unitaires/legal-facts.test.ts -t "cópias de segurança"
```

Não use `npx vitest run` sem `--dir`: o `vitest.config.ts` já exclui
`tests/E2E/**` (arquivos do Playwright chamados `*.test.ts`), mas o
`--dir tests/unitaires` deixa claro o escopo e é o que os scripts e o CI
usam.

## Unitários (Vitest)

- **Versão:** Vitest 1.6.0 com `@vitest/coverage-v8` 1.6.0, fixadas na
  mesma versão. A API e o app usam a mesma linha, para os três repositórios
  terem os mesmos idiomas de config e de CLI.
- **Ambiente padrão:** `happy-dom`, porque os stores persistem em
  `localStorage` (jsdom não é opção no Node 22.21). Um teste que só lê
  arquivos, roda scripts ou sobe um servidor declara
  `// @vitest-environment node` na primeira linha.
- **Nomes:** `tests/unitaires/<assunto>.test.ts` ou `.test.tsx`. São cerca de
  380 arquivos.
- **Aliases** (`vitest.config.ts`): `@` → `src/`; `server-only` → o gêmeo
  vazio do Next; `next/font/local` → `tests/unitaires/helpers/next-font-local.ts`.
- **Helpers** em `tests/unitaires/helpers/`: `render-html.ts` (renderiza
  componentes do servidor), `client-graph.ts` (grafo de imports do cliente),
  `contrast.ts` e `rendered-contrast.ts` (contraste WCAG),
  `measure-in-chromium.ts`, `in-time-zone.ts`, `public-config.ts` e
  `request-data-chains.ts`.

O que eles cobrem, em grandes grupos:

- **Regras de acesso:** `app-routes`, `route-access`, permissões, o
  middleware e o que some ou fica desabilitado por papel e por módulo.
- **Server Actions:** o que vai para a API, como uma recusa vira mensagem e
  quais tags são revalidadas.
- **Componentes e telas:** formulários com validação ao vivo, `DataTable`,
  `RowActions`, diálogos, abas, tutoriais, tema e contraste.
- **Configuração em runtime:** `src/env/**` (boot que recusa variável
  faltando, leitor do navegador igual ao esquema zod).
- **Segurança:** CSP, `/api/csp-report`, relay same-origin, cookies, sem
  vazamento de token em log.
- **Conteúdo:** `legal-facts.test.ts` (cada prazo e cada terceiro das
  políticas confere com o código), `docs-portal-*.test.ts` (os exemplos dos
  guias executam de verdade), blog, imagens de compartilhamento.
- **Infraestrutura:** workflows, `Dockerfile`, configuração da Application
  do Dokploy (`docs/deploy.md`), scripts do deploy.
  Veja a [seção própria](#testes-que-guardam-a-infraestrutura-e-a-documentação).

## Regras no runner do Playwright (`tests/E2E`)

São regras puras extraídas de componentes: janela de mensagens do chat,
gravação e scrub de áudio, galeria de imagens, mapa da torre, regras de
reversão de importação, critérios de auditoria do comprovante, indexação das
páginas públicas, catálogo de templates de mensagem e superfície de
integrações.

- **Nunca pedem navegador.** Nenhum teste dessa pasta usa a fixture `page`,
  `context` ou `browser` (`ci-test-gates.test.ts` falha se usar). Por isso, o
  CI não precisa de `playwright install` para elas.
- `yarn test:rules` roda um projeto só (`chromium`): a lógica não muda por
  navegador.
- **Sem nova tentativa** (`retries: 0`, também no CI): são regras puras, sem
  navegador, rede nem relógio. Uma regra que falha uma vez está errada, e
  repetir só esconderia. `forbidOnly` vale no CI.
- Um teste que precisa de tela vai para `tests/ui`, com a stack rodando.

## Suítes de navegador contra a stack (`ui`, `a11y`, `responsive`)

| Config                            | Pasta              | Workers | Pergunta                                            |
| --------------------------------- | ------------------ | ------- | --------------------------------------------------- |
| `playwright.ui.config.ts`         | `tests/ui`         | 3       | A tela mostra o que a API mandou? Os fluxos fecham? |
| `playwright.a11y.config.ts`       | `tests/a11y`       | 3       | O axe aceita? Dá para operar pelo teclado?          |
| `playwright.responsive.config.ts` | `tests/responsive` | 4       | Cabe de 320 a 1920 px?                              |

Elas abrem um Chromium de verdade contra a API em `:3334` e a web em `:3100`.
Nenhuma sobe a stack sozinha. O passo a passo local completo está em
[`tests/ui/README.md`](../tests/ui/README.md). Em resumo:

1. **Banco e Redis descartáveis** (nunca os do dia a dia): o Postgres
   `trajetto-itest-pg` na porta 54321, com o banco `load_test`, e o Redis
   `trajetto-test-redis`. O seed da API **recusa** qualquer banco fora da
   porta 54321.
2. **No `trajetto-api`:** `npx prisma migrate deploy`, depois
   `npx tsx tests/load/seed.ts` (grava `load-context.json`),
   `npx tsx tests/load/mint-master.ts` (grava `browser-sessions.json`) e
   `npx tsx tests/load/mint-browser-users.ts` (grava `browser-users.json`,
   com a senha `WEB_E2E_PASSWORD`).
3. **API** com `NODE_ENV=test PORT=3334 API_HTTP_REQUEST=http://localhost:3334`.
4. **Web** em `:3100`, com `PUBLIC_API_URL`, `HTTP_REQUEST`,
   `METADATA_BASE`, o mesmo `RATE_LIMIT_FORWARDER_SECRET` da API e as
   **chaves de teste públicas** do Turnstile (`1x00000000000000000000AA` e
   `1x0000000000000000000000000000000AA`, que sempre aprovam). Localmente,
   use `next dev -p 3100` com `NEXT_DEV_KEEP_PAGES=1` e
   `NODE_OPTIONS=--max-old-space-size=6144`, e rode o Playwright com
   `E2E_DEV_SERVER=1`. O CI usa o servidor `standalone` da build de
   produção, que é o que a imagem roda, com
   `TURNSTILE_SITEVERIFY_URL` apontando para o dublê local do siteverify
   (abaixo).
5. O processo do Playwright precisa do mesmo `DATABASE_URL` do passo 1 (o
   2FA e as contas criadas no meio de uma jornada passam pelos scripts
   `mint-*.ts` da API) e do mesmo `RATE_LIMIT_FORWARDER_SECRET` da API e da
   web.

### Sem rede externa: os dublês

As suítes são o gate da imagem de staging, e nenhum serviço de terceiro pode
reprová-las. Todo spec importa `test` e `expect` de
`tests/ui/support/test.ts` (nunca de `@playwright/test`), e esse `test` torna
**todo contexto do navegador** hermético (`tests/ui/support/hermetic.ts`): o
contexto da fixture e os que o spec abre sozinho (`browser.newContext()`,
`browser.newPage()`, `signedInContext`). O aquecimento, que abre o próprio
navegador, faz o mesmo.

| Terceiro                                                                   | O que a página recebe (`tests/ui/support/external-doubles.ts`)                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| tiles do OpenStreetMap (`*.tile.openstreetmap.org`)                        | um PNG de cor sólida, na mesma URL (a CSP não muda e o Leaflet marca o tile como carregado)                                                                                                                                                                                          |
| `api.js` do Turnstile (`challenges.cloudflare.com`)                        | um dublê do script com cenários (`pass`, `error-once`, `expire`, `hang`, `frame`); o token é o token de teste da Cloudflare                                                                                                                                                          |
| frame do widget (`challenges.cloudflare.com`)                              | um documento que avisa a página que carregou, para o cenário `frame` provar a `frame-src` da CSP                                                                                                                                                                                     |
| ViaCEP                                                                     | o CEP `01001000` (Praça da Sé); qualquer outro CEP responde "não encontrado", como o ViaCEP                                                                                                                                                                                          |
| Nominatim (busca e reverso)                                                | a Praça da Sé, no formato `jsonv2`                                                                                                                                                                                                                                                   |
| `standalone.js` do Scalar no jsDelivr (console `/integration/docs` da API) | o mesmo arquivo, tirado do pacote no **registro do npm** e conferido com o SHA-384 que a API fixa (`tests/ui/support/scalar-bundle.ts`), em cache em `node_modules/.cache/trajetto-e2e`. O `docs-console.spec.ts` o busca antes dos casos; o navegador confere o `integrity` de novo |

Qualquer outra requisição que sairia da máquina é **bloqueada** (nunca
buscada), aparece no log como `[rede externa] bloqueada, sem dublê` e vira um
aviso no resumo do run. Quem acrescentar uma tela que chame outro terceiro
acrescenta o dublê dele em `external-doubles.ts`. A única rede que as suítes
usam fora da máquina é o registro do npm (o mesmo de toda instalação), para o
arquivo do Scalar; ele é baixado uma vez e fica em cache (no CI, também
entre corridas). Como numa instalação, um erro de transporte, um 429 ou um
5xx do registro é repetido até três vezes, com uma linha `[scalar]` no log
a cada tentativa; um 404 ou um arquivo que não confere com o hash falha na
hora.

No servidor, o login valida o token do captcha no siteverify. No CI, o
servidor da web aponta `TURNSTILE_SITEVERIFY_URL` para o dublê local
`tests/ui/support/turnstile-siteverify-double.mjs`, que as três configs sobem
sozinhas (`webServer`, porta `E2E_DOUBLES_PORT`, padrão 3199) e que responde
como a Cloudflare documenta as chaves de teste. A variável só vale com uma
chave secreta **de teste** da Cloudflare e só para um endereço de loopback
(`src/lib/turnstile-siteverify.ts`): uma chave real sempre vai à Cloudflare,
o que `turnstile-siteverify.test.ts` prova. O caso
"the server checks the token" de `auth-captcha-states.spec.ts` confere que o
servidor perguntou ao dublê.

O captcha só monta na build de produção: no `next dev`,
`auth-captcha-states.spec.ts` se pula sozinho. O spec usa o dublê do
`api.js` para provocar erro, expiração e tempo esgotado, bloqueia
`challenges.cloudflare.com` para o estado de script bloqueado e, no cenário
`frame`, carrega o frame do widget sob a CSP da página. **Nenhum caso usa o
widget real:** o único que usava era também o único que podia falhar por
causa da Cloudflare, e o que só ele provava (a `frame-src` liberando a
Cloudflare) agora é provado pelo cenário `frame` e pelo
`content-security-policy.test.ts`. O widget real, com a chave real, é o que
roda em staging. Os estados e o token também têm testes unitários com o
`react-turnstile` simulado (`captcha-turnstile-states`, `captcha-forms`,
`captcha-machine`).

### Uma pessoa por contexto: o limite de login

A API limita o login anônimo a oito por minuto **por endereço**. Antes, todo
login das suítes saía do mesmo loopback: a suíte inteira era uma pessoa só
para o limitador, o nono login de qualquer minuto esperava 61 s pela janela,
e a duração de um teste dependia do que o outro worker tinha acabado de
fazer. Agora cada contexto do navegador manda um endereço privado próprio
(`X-Forwarded-For`, como o proxy de produção), o servidor da web o repassa à
API com `RATE_LIMIT_FORWARDER_SECRET` (`src/lib/api-forwarding.ts`) e cada
contexto tem o próprio balde. Os logins pela API (`apiLogin`) mandam os
mesmos cabeçalhos do encaminhamento. O limite continua real; os helpers
nunca esperam a janela. Se ele responder, o encaminhamento não está montado
(a API, a web ou o Playwright sem o mesmo segredo), e o helper falha dizendo
isso.

O gestor de cada spec também é dele: a posição do arquivo na pasta da suíte
escolhe um dos 50 gestores do seed (`tests/ui/support/spec-slot.ts`), e o
`managerToken()` passa pela mesma escolha. Assim dois specs que rodam juntos
nunca dividem o limite de 30 handshakes de socket por minuto de um usuário.

### Testes instáveis

No CI, cada teste das três suítes tem **uma** nova tentativa; localmente,
nenhuma. Um teste que só passa na nova tentativa não reprova o job, mas
nunca some: o reporter `tests/ui/support/run-summary-reporter.ts` escreve um
aviso (`::warning::`) com o nome, o arquivo, a linha e o erro da primeira
tentativa, e uma seção no resumo do run com a lista. Cada um é um defeito a
corrigir (no teste ou no produto). O mesmo resumo lista as requisições
bloqueadas sem dublê e os cliques que precisaram ser repetidos até o alvo
abrir (`clickUntilVisible`). As três configs também têm `forbidOnly` no CI
(um `test.only` esquecido reprova) e uma pasta de resultados própria
(`test-results/ui`, `test-results/a11y`, `test-results/responsive`): cada
corrida esvazia a sua, e uma pasta comum perdia os traces da suíte anterior.

Esperas: um teste espera um **estado** (o frame de conexão do socket, o
anúncio do dnd-kit, a lista do ⌘K filtrada, a gaveta assentada), nunca um
tempo fixo no lugar dele (a medida do link de e-mail do `/contato` espera as
animações de entrada terminarem, não 1,2 s). Pausas fixas só existem onde a
própria pausa é o estímulo (o intervalo entre teclas no teste da gaveta, o
prazo do produto que precisa vencer, como o frescor do seletor ou o
intervalo do botão Atualizar), como janela de silêncio de um teste de
ausência, ou como margem depois de o estado já ter sido esperado. Na build
de produção, `waitForHydration` não
recarrega a página: uma página de produção que não hidrata é defeito, e o
teste falha com os erros que ela lançou. Só contra o `next dev`
(`E2E_DEV_SERVER=1`) e só com chunk quebrado ele recarrega uma vez.

### Variáveis que essas suítes leem

| Variável                      | Para quê                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `RESPONSIVE_BASE_URL`         | troca a URL da web (padrão `http://localhost:3100`) nas três configs                                                             |
| `LOAD_BASE_URL`               | URL da API usada pelos specs (padrão `http://localhost:3334`)                                                                    |
| `UI_SKIP_WARM_UP=1`           | pula o aquecimento do `globalSetup` (`tests/ui/support/warm-up.ts`) numa corrida de um arquivo só                                |
| `WEB_E2E_PASSWORD`            | senha das contas de `mint-browser-users.ts`                                                                                      |
| `DATABASE_URL`                | o banco descartável, para os `mint-*.ts` chamados durante os specs                                                               |
| `RATE_LIMIT_FORWARDER_SECRET` | o mesmo da API e da web: os logins pela API de cada teste contam como uma pessoa própria                                         |
| `E2E_DEV_SERVER=1`            | a web é o `next dev`: `waitForHydration` pode recarregar uma vez por chunk quebrado. Nunca no CI                                 |
| `E2E_DOUBLES_PORT`            | porta do dublê do siteverify que as configs sobem (padrão 3199)                                                                  |
| `CI`                          | uma nova tentativa nas suítes de navegador e `forbidOnly` nas quatro configs                                                     |
| `E2E_PROBES=1`                | abre `/dashboard/boundary-probe` (página que quebra de propósito) numa build de produção, para `tests/ui/error-boundary.spec.ts` |

No servidor da web das suítes (não no Playwright):
`TURNSTILE_SITEVERIFY_URL=http://127.0.0.1:3199/turnstile/v0/siteverify`
numa build de produção.

Rode cada config com os workers dela, como o CI faz. As falhas que só
aparecem com o servidor compilando outras rotas ao mesmo tempo são as que
importam.

## Cobertura

- **Medida de verdade, publicada e sem piso (decisão 13.1).** Todo arquivo
  `.ts`/`.tsx` de `src/` entra na conta (`all: true`), inclusive páginas que
  nenhum teste renderiza. Assim o número é honesto, e não lisonjeiro.
- Provedor v8, relatórios `text-summary`, `json-summary`, `json`, `lcov` e
  `html` em `coverage/`. O relatório sai mesmo com teste vermelho
  (`reportOnFailure`).
- O glob de exclusão do Vitest foi estreitado: `src/app/docs/_lib/public-spec.ts`
  e `guide-spec.tsx` são código de produto, não testes.
- O `ci.yml` roda `yarn test:unit --coverage` e publica (uma falha do
  serviço de artefatos não reprova, porque a cobertura não é gate) o artefato
  `coverage-<sha>` por 14 dias.
- `coverage-measured.test.ts` garante tudo isso. Criar um piso de cobertura
  é uma decisão à parte: não acrescente `thresholds` por conta própria.

## Mutação (Stryker)

- `yarn test:mutation` muta as regras críticas listadas em
  `stryker.config.mjs`: autorização (`middleware.ts`, `permissions.ts`,
  `route-access.ts`, regras de perfil de acesso, checagens de navegação), o
  estado da lista no servidor (`server-table.ts`), a chave de idempotência e
  as regras de autorização de ocorrência e de ticket.
- **Gate:** `thresholds.break = 90`. A corrida de 06/10/2026 deu web 96,53
  (API 96,17, app 97,16). Um resultado abaixo de 90 falha.
- Stryker 8.7.1, a última linha cujo runner aceita Vitest 1.x. Fixado.
- Uma corrida inteira leva minutos e usa 6 runners (~4 GB). **Não roda no CI.**
  Rode localmente antes de mexer nas regras listadas.
- Foco num arquivo:
  `MUTATION_TESTS=<globs separados por vírgula> yarn test:mutation --mutate <arquivo>`.
  Os mutantes estáticos (tabelas no nível do módulo) são pulados na corrida
  larga. `MUTATION_STATIC=1` os inclui numa corrida focada.
- Relatórios em `reports/mutation/` (HTML e JSON). O sandbox fica em
  `.stryker-tmp/`, fora do git.

## Onde cada suíte roda no CI

| Evento                                                     | Workflow                                             | O que roda                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| push em qualquer branch de trabalho (não `staging`/`main`) | `ci.yml`                                             | audit, Prettier, ESLint, `tsc`, unitários com cobertura, `test:rules`, gitleaks   |
| push em `staging`                                          | `deploy.yml` → chama `ci.yml` e `browser-suites.yml` | tudo acima + `ui`, `a11y` e `responsive`. A imagem só é construída se tudo passar |
| pull request para `main`                                   | `ci.yml` e `browser-suites.yml`                      | a mesma validação sobre o resultado do merge                                      |
| sob demanda (Run workflow), nunca agendado                 | `browser-suites.yml`                                 | `ui`, `a11y` e `responsive` no branch escolhido                                   |

Sem o secret `API_REPO_READ_TOKEN`:

- `browser-suites.yml` **pula** as suítes, com um aviso no resumo do run. Ele
  não falha, para o deploy não travar enquanto o token não existe.
- `ci.yml` pula os testes de socket contra o servidor real, também com aviso.

Com o token, o CI faz checkout da `trajetto-api` na **mesma branch** (ou na
padrão, se ela não existir). Uma mudança que atravessa os dois repositórios é
testada contra a sua contraparte. Só a resposta "a branch não existe" cai na
padrão, com um aviso no run; um erro de rede ou de credencial na consulta é
repetido e depois reprova o job, em vez de testar em silêncio contra a
`main` da API (`docs/deploy.md`, seção 3).

Nenhum job reprova por instabilidade de fora do código: versões e imagens
fixas, `bash -eo pipefail`, prazo em todo job, repetição visível só em
chamada de rede e cache que nunca reprova. As regras e o porquê de cada uma
estão em `docs/deploy.md`, seção 3, "Regras de estabilidade dos três
workflows". O `audit-ci` só bloqueia uma mudança de dependência (decisão
D1, mesma seção).

## Testes que guardam a infraestrutura e a documentação

Vários testes unitários leem arquivos de configuração e falham quando uma
garantia some. Quem muda um workflow, o `Dockerfile`, as Swarm Settings ou o
Traefik documentados em `docs/deploy.md` roda estes testes:

| Teste                                                    | O que garante                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-promotion.test.ts`                               | Applications do Dokploy em `staging` e `stable`, nunca `latest`; build único com só `METADATA_BASE` e `GIT_SHA`; build só em staging, depois de `ci.yml` e das suítes de navegador; tag imutável `sha-<commit>`; `staging` e `stable` movidas por digest; promote acha o build que o staging serviu para o commit do merge (segundo pai, ou o próprio commit num fast-forward) pelo `staged-build.mjs`, recusa merge com conteúdo diferente e falha claramente sem imagem; nenhum erro do GHCR lido como "tag inexistente"; `image_tag` validada e nunca interpolada no shell; deploy pela API do Dokploy com o mesmo script da API, pulado sem os secrets; valores públicos lidos em runtime do Environment da Application e do `.env.example`, sem `NEXT_PUBLIC_` |
| `promote-route-gate.test.ts`, `check-api-routes.test.ts` | o gate de rotas roda antes de mover `stable`, com o script do commit do workflow e o código do commit da imagem; lê o `/docs/json` de novo até o prazo enquanto faltam rotas ou a leitura falha por rede ou 5xx, falha na hora numa leitura recusada e, no prazo, lista o que falta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `staged-build.test.ts`                                   | o promote espera um run de staging ainda em andamento; um commit sem run promove o build do ancestral mais próximo que o staging serviu só quando a diferença é documentação; recusa código que nunca rodou, run que terminou sem o marcador, prazo esgotado e erro do GHCR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `docs-only.test.ts`                                      | "só documentação" é `*.md` e `docs/`, exatamente o que o `.dockerignore` tira do build; renomeação conta pelos dois nomes; nome com acento lido como ele é; erro do git nunca vira "só documentação"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `deploy-staging-head.test.ts`                            | o passo "Is this run still staging's head?" rodado contra repositórios git reais: faz o deploy quando o HEAD novo só traz documentação, deixa para o run novo quando há código (inclusive arquivo de código movido para `docs/`), repete a leitura do HEAD e falha em vez de pular o deploy                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ghcr.test.ts`                                           | leituras e trocas de tag no GHCR: "not found" é resposta, login recusado falha na hora, erro de transporte repete com aviso e espera crescente e depois falha dizendo que foi o registry; o commit de origem lido do registry sem baixar a imagem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `wait-for-build.test.ts`                                 | a janela de estabilidade do rollout só zera com resposta de outro build; consulta sem resposta não conta, é somada no aviso e no resumo, e erros sozinhos nunca aprovam                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `dependency-gate.test.ts`                                | o `audit-ci` bloqueia só mudança em `package.json`, `yarn.lock`, `package-lock.json` ou `audit-ci.jsonc` (e sem base para comparar); fora disso o achado vira aviso e resumo; o passo do `ci.yml` rodado com o `audit-ci` do `node_modules` simulado (veredito e falha de rede separados, com 3 tentativas)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `image-scan-steps.test.ts`                               | os passos do Trivy rodados com o `docker` simulado: banco em cache, cópia do cache quando o download falha, resumo que separa falha no download, achados e scan que não rodou; com `IMAGE_SCAN_ENFORCE`, só o achado reprova (scan que não rodou avisa)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `workflow-sibling-probe.test.ts`                         | a escolha da branch da API nos dois workflows: só "branch inexistente" cai na padrão; erro de rede repete e depois reprova; o token nunca aparece                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `workflow-determinism.test.ts`                           | todo workflow com `bash -eo pipefail` e todo job com prazo; Node igual ao das imagens; todo contêiner por digest; `cache-to` com `ignore-error`; BuildKit fixado; uploads de relatório que não reprovam; nenhum pipe sem conferência; caches do Chromium, dos engines do Prisma e do renderizador do console nas suítes de navegador                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `deployment-skew.test.ts`                                | `GIT_SHA` vira `NEXT_PUBLIC_BUILD_SHA` num build só; `/build-id.json` fora do middleware                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `dokploy-deploy.test.ts`                                 | o script de deploy (cópia do da API, comparada quando o irmão existe) acompanha o deployment que ele criou, dispara de novo um deployment em `error` (até 6 tentativas), não repete um `cancelled`, falha num 4xx, exige https e nunca imprime a chave                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ci-test-gates.test.ts`                                  | `test:rules` em todo push e na validação de staging; PR para main validado; suítes de navegador reutilizáveis, com skip sem token, sem agendamento, com seed e servidor `standalone`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `secrets-hygiene.test.ts`                                | `.gitignore` de `.env*`; gitleaks no histórico inteiro; nenhum build antes da validação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `supply-chain.test.ts`                                   | Dependabot (npm, actions, Docker) apontando para `staging`; actions fixadas por SHA; audit-ci; SBOM, proveniência e Trivy por digest, com código de saída próprio para achado e o banco do cache; base fixada por digest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `coverage-measured.test.ts`                              | cobertura medida em tudo e publicada no CI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `browser-suites-install.test.ts`                         | instala devDependencies antes do build das suítes de navegador                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `browser-suites-hermetic.test.ts`                        | todo spec das três suítes importa o `test` hermético; as três configs dividem nova tentativa, `forbidOnly`, o resumo do run e o dublê do siteverify, cada uma com a própria pasta de resultados; `tests/E2E` sem nova tentativa; os helpers de login nunca esperam a janela da API; o reporter transforma teste instável em aviso e seção no resumo                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `browser-doubles.test.ts`                                | os dublês de tiles, Turnstile, ViaCEP e Nominatim, passados pelo código do próprio produto (geocodificação, leitura do CEP, `onload` do `api.js`, frame do widget)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `browser-suite-sessions.test.ts`                         | cada spec de uma suíte entra com um gestor diferente, e nenhuma pasta tem mais specs que os 50 gestores do seed da API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `turnstile-siteverify.test.ts`                           | `TURNSTILE_SITEVERIFY_URL` só vale com chave secreta de teste da Cloudflare e para loopback; uma chave real sempre vai à Cloudflare; o dublê local responde como a Cloudflare documenta as chaves de teste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scalar-bundle.test.ts`                                  | o renderizador do console da API sai do pacote certo e só é servido quando confere com o SHA-384 que a API fixa (lê `../trajetto-api` e pula sem ele)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `browser-suites-wiring.test.ts`                          | o job `browser-suites` dá o mesmo `RATE_LIMIT_FORWARDER_SECRET` à API, à web e ao Playwright, aponta `TURNSTILE_SITEVERIFY_URL` para o dublê e sobe os traces de toda corrida terminada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `application-swarm-settings.test.ts`                     | as Swarm Settings da Application em `docs/deploy.md` (seção 6.4): health check igual ao `HEALTHCHECK` do `Dockerfile`, update `start-first` com rollback, janela do `wait-for-build.mjs` maior que o monitor do Swarm, restart sem teto, teto de memória com heap menor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `edge-hsts.test.ts`                                      | HSTS com preload em toda resposta do `next.config.mjs`; redirect do domínio sem www com HSTS antes do 301, no arquivo do Traefik de `docs/deploy.md` (seção 18)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `boundary-probe-gate.test.ts`                            | a página que quebra de propósito só abre com `E2E_PROBES=1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `legal-facts.test.ts`                                    | prazos e terceiros das políticas contra o código. A retenção dos backups vem do `Keep Latest` do backup do Dokploy em `docs/deploy.md` da API (agenda diária, uma única versão aceita)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Do lado da API, alguns testes também leem este repositório (o
`deploy.yml`, o `wait-for-build.mjs`, o passo "Pick the sibling branches"
do `ci.yml` e do `browser-suites.yml`, que eles rodam com o `git` simulado,
e o `src/` para o contrato de rotas). Eles pulam quando `../trajetto-ui` não
existe.

## Testes que leem os repositórios irmãos

- `legal-facts.test.ts` lê `../trajetto-api` e `../trajetto-mobile`. Quando
  um deles não está ao lado, os fatos daquele repositório são pulados
  visivelmente. `LEGAL_FACTS_API` e `LEGAL_FACTS_MOBILE` apontam para uma
  cópia alterada (usado em corrida de mutação dos textos).
- Os testes de socket usam o `socket.io` (servidor) das dependências de
  `../trajetto-api` e pulam sem ele.

## Regras para escrever um teste

1. **Título em inglês**, descrevendo o comportamento
   (`it("refuses a merge whose content is not the staging commit's")`).
   Mensagens de asserção e de erro podem estar em português quando repetem o
   que o produto diz.
2. **Vermelho antes de verde.** Escreva o teste, veja falhar pelo motivo
   certo e só então corrija o código. Um teste que nunca falhou não prova
   nada.
3. **Caminhos reais.** Prefira rodar o código de verdade: o script com
   `spawn` contra um servidor falso no loopback, o componente renderizado, o
   arquivo de config lido do disco. Mock só no que não dá para rodar (rede
   externa, relógio).
4. **Um comentário em inglês no topo do `describe`** explicando o defeito
   que o teste impede. Os comentários de código ficam em inglês. Os
   documentos e as mensagens ao usuário ficam em português.
5. **Teste que guarda configuração** lê o arquivo e procura a garantia, não
   a formatação. Normalize `\r\n` quando comparar linhas.
6. **Nada de segredo em teste.** Use valores falsos óbvios. O
   `.gitleaks.toml` só silencia a regra genérica em `tests/` e no
   `.env.example`. Uma chave de provedor de verdade num teste ainda falha o
   CI.
7. **Pule visivelmente** (`describe.skipIf`) o que depende de algo externo
   ausente, com o motivo no nome ou num comentário.
8. Teste de tela que precisa de API vai para `tests/ui`. Regra pura vai para
   `tests/unitaires` ou `tests/E2E`.
9. **Spec de navegador importa `test` e `expect` de `tests/ui/support/test.ts`**
   (`../ui/support/test` em `a11y` e `responsive`), nunca de
   `@playwright/test`: é o que deixa o contexto sem rede externa e com
   endereço próprio.
10. **Espere um estado, não um tempo.** `waitForTimeout` só onde a pausa é o
    estímulo do teste, com o motivo num comentário. Para "o socket entrou na
    sala", use `socketConnected`; para "a lista reagiu", espere a lista; para
    animação, espere `getAnimations()` terminar.
11. **Nenhum teste depende de terceiro.** Tela nova que chama um serviço de
    fora ganha um dublê em `tests/ui/support/external-doubles.ts`, com um
    caso em `browser-doubles.test.ts` lendo a resposta pelo código do produto.

## Windows

O dono desenvolve no Windows (Git Bash e PowerShell). O que muda:

- `public-og-image-render.test.ts` é pulado no Windows: o `next/og` do
  Next 14 não acha a fonte nessa plataforma. O cartão continua testado pelo
  `public-og-image.test.ts`.
- `docs-portal-samples.test.ts` decodifica a saída dos exemplos como UTF-8
  (o console do Windows leria cp1252).
- `tests/ui/support/login.ts` usa `shell: true` no Windows para chamar os
  `mint-*.ts`.
- `next dev` passou do limite de memória numa corrida inteira da suíte `ui`
  (25 min, três workers) e se reiniciou sozinho. Suba-o com
  `NODE_OPTIONS=--max-old-space-size=6144` e reinicie entre corridas.

## Solução de problemas

| Sintoma                                                      | Causa provável                                    | O que fazer                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Playwright Test did not expect test.describe()` no Vitest   | o Vitest pegou `tests/E2E`                        | use `yarn test:unit` (`--dir tests/unitaires`)                               |
| `legal-facts` pulando fatos                                  | `../trajetto-api` ou `../trajetto-mobile` ausente | faça o checkout ao lado                                                      |
| Specs da `ui` com `SyntaxError: Invalid or unexpected token` | `next dev` frio entregando chunk em compilação    | deixe o `globalSetup` aquecer (não use `UI_SKIP_WARM_UP` na corrida inteira) |
| `support/login.ts` parando com aviso de banco                | `DATABASE_URL` ausente no processo do Playwright  | exporte o do banco descartável                                               |
| Tokens do `load-context.json` recusados                      | venceram (~12 h)                                  | rode de novo `mint-master.ts` e `mint-browser-users.ts`                      |
| Suítes de navegador "puladas" no CI                          | falta `API_REPO_READ_TOKEN`                       | crie o secret (`deploy.md`)                                                  |
| `a API limitou o login por endereço`                         | o encaminhamento de endereço não está montado     | o mesmo `RATE_LIMIT_FORWARDER_SECRET` na API, na web e no Playwright         |
| `o elemento não foi hidratado pelo React`                    | a página não hidratou (os erros vêm na mensagem)  | na build de produção é defeito; contra o `next dev`, use `E2E_DEV_SERVER=1`  |
| `[rede externa] bloqueada, sem dublê` / aviso no resumo      | a tela chamou um terceiro sem dublê               | acrescente o dublê em `tests/ui/support/external-doubles.ts`                 |
| "the server checks the token" falha                          | o servidor da web não usa o dublê do siteverify   | `TURNSTILE_SITEVERIFY_URL` apontando para o dublê (porta `E2E_DOUBLES_PORT`) |
| aviso "Teste instável" num run verde                         | o teste só passou na nova tentativa               | corrija a causa: o aviso traz o erro da primeira tentativa                   |
