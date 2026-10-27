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

| Suíte                                             | Pasta              | Config                            | Comando                                                  | Precisa de                                  | No CI                                                            |
| ------------------------------------------------- | ------------------ | --------------------------------- | -------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Unitários (componentes, regras, actions, configs) | `tests/unitaires`  | `vitest.config.ts`                | `yarn test:unit`                                         | nada (happy-dom)                            | todo push e PR (`ci.yml`)                                        |
| Regras no runner do Playwright                    | `tests/E2E`        | `playwright.config.ts`            | `yarn test:rules`                                        | nada, sem navegador                         | todo push e PR (`ci.yml`)                                        |
| Interface contra a stack                          | `tests/ui`         | `playwright.ui.config.ts`         | `npx playwright test -c playwright.ui.config.ts`         | API em `:3334`, web em `:3100`, seed da API | push em staging, PR para main, toda noite (`browser-suites.yml`) |
| Acessibilidade (axe)                              | `tests/a11y`       | `playwright.a11y.config.ts`       | `npx playwright test -c playwright.a11y.config.ts`       | idem                                        | idem                                                             |
| Responsivo (320 a 1920 px)                        | `tests/responsive` | `playwright.responsive.config.ts` | `npx playwright test -c playwright.responsive.config.ts` | idem                                        | idem                                                             |
| Mutação                                           | regras críticas    | `stryker.config.mjs`              | `yarn test:mutation`                                     | nada (lento)                                | não roda no CI                                                   |

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
  vazio do Next; `next/font/google` → `tests/unitaires/helpers/next-font-google.ts`.
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
   `METADATA_BASE` e as **chaves de teste públicas** do
   Turnstile (`1x00000000000000000000AA` e
   `1x0000000000000000000000000000000AA`, que sempre aprovam). Localmente,
   use `next dev -p 3100` com `NEXT_DEV_KEEP_PAGES=1` e
   `NODE_OPTIONS=--max-old-space-size=6144`. O CI usa o servidor
   `standalone` da build de produção, que é o que a imagem roda.
5. O processo do Playwright precisa do mesmo `DATABASE_URL` do passo 1: o
   2FA e as contas criadas no meio de uma jornada passam pelos scripts
   `mint-*.ts` da API.

Variáveis que essas suítes leem:

| Variável              | Para quê                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `RESPONSIVE_BASE_URL` | troca a URL da web (padrão `http://localhost:3100`) nas três configs                                                             |
| `LOAD_BASE_URL`       | URL da API usada pelos specs (padrão `http://localhost:3334`)                                                                    |
| `UI_SKIP_WARM_UP=1`   | pula o aquecimento do `globalSetup` (`tests/ui/support/warm-up.ts`) numa corrida de um arquivo só                                |
| `WEB_E2E_PASSWORD`    | senha das contas de `mint-browser-users.ts`                                                                                      |
| `DATABASE_URL`        | o banco descartável, para os `mint-*.ts` chamados durante os specs                                                               |
| `E2E_PROBES=1`        | abre `/dashboard/boundary-probe` (página que quebra de propósito) numa build de produção, para `tests/ui/error-boundary.spec.ts` |

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
- O `ci.yml` roda `yarn test:unit --coverage` e publica o artefato
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
| toda noite (03:00 de Brasília) e sob demanda               | `browser-suites.yml`                                 | `ui`, `a11y` e `responsive` no branch padrão                                      |

Sem o secret `API_REPO_READ_TOKEN`:

- `browser-suites.yml` **pula** as suítes, com um aviso no resumo do run. Ele
  não falha, para o deploy não travar enquanto o token não existe.
- `ci.yml` pula os testes de socket contra o servidor real, também com aviso.

Com o token, o CI faz checkout da `trajetto-api` na **mesma branch** (ou na
padrão, se ela não existir). Uma mudança que atravessa os dois repositórios é
testada contra a sua contraparte.

## Testes que guardam a infraestrutura e a documentação

Vários testes unitários leem arquivos de configuração e falham quando uma
garantia some. Quem muda um workflow, o `Dockerfile`, as Swarm Settings ou o
Traefik documentados em `docs/deploy.md` roda estes testes:

| Teste                                                    | O que garante                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-promotion.test.ts`                               | Applications do Dokploy em `staging` e `stable`, nunca `latest`; build único com só `METADATA_BASE` e `GIT_SHA`; build só em staging, depois de `ci.yml` e das suítes de navegador; tag imutável `sha-<commit>`; `staging` e `stable` movidas por digest; promote acha a imagem do commit de staging (segundo pai do merge, ou o próprio commit num fast-forward), recusa merge com conteúdo diferente e falha claramente sem imagem; `image_tag` validada e nunca interpolada no shell; deploy pela API do Dokploy com o mesmo script da API, pulado sem os secrets; valores públicos lidos em runtime do Environment da Application e do `.env.example`, sem `NEXT_PUBLIC_` |
| `promote-route-gate.test.ts`, `check-api-routes.test.ts` | o gate de rotas roda antes de mover `stable`, com o script do commit do workflow e o código do commit da imagem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `deployment-skew.test.ts`                                | `GIT_SHA` vira `NEXT_PUBLIC_BUILD_SHA` num build só; `/build-id.json` fora do middleware                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `dokploy-deploy.test.ts`                                 | o script de deploy (cópia do da API, comparada quando o irmão existe) acompanha o deployment que ele criou, dispara de novo um deployment em `error` (até 3 vezes), não repete um `cancelled`, falha num 4xx, exige https e nunca imprime a chave                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ci-test-gates.test.ts`                                  | `test:rules` em todo push e na validação de staging; PR para main validado; suítes de navegador reutilizáveis, com skip sem token, noturnas, com seed e servidor `standalone`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `secrets-hygiene.test.ts`                                | `.gitignore` de `.env*`; gitleaks no histórico inteiro; nenhum build antes da validação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `supply-chain.test.ts`                                   | Dependabot (npm, actions, Docker) apontando para `staging`; actions fixadas por SHA; audit-ci; SBOM, proveniência e Trivy por digest; base fixada por digest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `coverage-measured.test.ts`                              | cobertura medida em tudo e publicada no CI                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `browser-suites-install.test.ts`                         | instala devDependencies antes do build noturno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `application-swarm-settings.test.ts`                     | as Swarm Settings da Application em `docs/deploy.md` (seção 6.4): health check igual ao `HEALTHCHECK` do `Dockerfile`, update `start-first` com rollback, janela do `wait-for-build.mjs` maior que o monitor do Swarm, restart sem teto, teto de memória com heap menor                                                                                                                                                                                                                                                                                                                                                                                                       |
| `edge-hsts.test.ts`                                      | HSTS com preload em toda resposta do `next.config.mjs`; redirect do domínio sem www com HSTS antes do 301, no arquivo do Traefik de `docs/deploy.md` (seção 18)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `boundary-probe-gate.test.ts`                            | a página que quebra de propósito só abre com `E2E_PROBES=1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `legal-facts.test.ts`                                    | prazos e terceiros das políticas contra o código. A retenção dos backups vem do `Keep Latest` do backup do Dokploy em `docs/deploy.md` da API (agenda diária, uma única versão aceita)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Do lado da API, alguns testes também leem este repositório (o
`deploy.yml`, o `wait-for-build.mjs` e o
`src/` para o contrato de rotas). Eles pulam quando `../trajetto-ui` não
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
