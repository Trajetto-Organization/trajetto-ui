# CLAUDE.md — trajetto-ui

Guia para o Claude Code (e qualquer agente) trabalhar neste repositório. Leia
este arquivo inteiro antes de mudar código. O `AGENTS.md` tem o mesmo
conteúdo essencial, para outras ferramentas.

## O que é este repositório

A **web** do Trajetto, um SaaS B2B multiempresa para transportadoras, com dois
módulos: Frotas (`FLEET`) e Entregas (`DELIVERIES`). A web tem:

- o painel logado (`/dashboard` da empresa, `/admin` do MASTER, `/driver` do
  motorista);
- o site público, com blog e páginas legais em MDX;
- o portal da API (`/docs`);
- as páginas públicas `/acompanhar` (rastreio) e `/verificar` (comprovante).

Ela **não tem banco**: todo dado vem da `trajetto-api` (HTTP + Socket.IO). O
app do motorista é a `trajetto-mobile`. Os três repositórios ficam lado a
lado em `C:/dev/trajetto/` (`trajetto-api`, `trajetto-ui`, `trajetto-mobile`).
Alguns testes leem os irmãos e pulam quando eles não estão lá.

GitHub: `Trajetto-Organization/trajetto-ui`. Imagem:
`ghcr.io/trajetto-organization/trajetto-ui`.

## Documentos que você deve consultar

- `docs/arquitetura.md`: como tudo funciona e por quê. Leia a seção certa
  antes de mexer em cache, CSP, env, sessão ou acesso.
- `docs/testes.md`: suítes, comandos e regras de teste.
- `docs/deploy.md`: pipeline, Dokploy, promoção e rollback.
- `docs/variaveis-de-ambiente.md`: cada variável.
- `tests/ui/README.md`: como subir a stack para as suítes de navegador.

A pasta `docs/` da raiz do workspace (`C:/dev/trajetto/docs`) **não é
versionada**. Tudo o que importa para este repositório foi trazido para o
`docs/` daqui. Quando um comentário cita "decisão 12.2" ou "decisão 7.4", o
efeito dela está descrito nos docs deste repositório.

## Stack

Next.js 14.2 (App Router, RSC, saída `standalone`), Node 22, TypeScript,
Tailwind + shadcn/ui (Radix), `@tanstack/react-table`, react-query **v3**,
zod, zustand, socket.io-client, Leaflet, MDX, next-themes, Vitest 1.6,
Playwright e Stryker 8.7. Gerenciador de pacotes: **Yarn 1** (`yarn.lock`).
Não use npm nem pnpm para instalar.

## Comandos

```bash
yarn install                 # dependências
yarn dev                     # http://localhost:3000 (precisa da API em :3333)
yarn typecheck               # tsc --noEmit
yarn test:unit               # Vitest em tests/unitaires
npx vitest run --dir tests/unitaires <filtro>   # um arquivo ou assunto
yarn test:unit:coverage      # com cobertura
yarn test:rules              # tests/E2E (regras puras, runner do Playwright, sem navegador)
yarn test:mutation           # Stryker (lento; gate break 90)
yarn lint:check              # Prettier (o CI roda); yarn lint = ESLint
```

Suítes de navegador (precisam da API em `:3334` e da web em `:3100`, veja
`tests/ui/README.md`):
`npx playwright test -c playwright.ui.config.ts` (e `.a11y.` /
`.responsive.`).

**Regras do dono para agentes:**

- **Não rode `yarn lint`, `yarn lint:check`, `yarn build` nem `next build`.**
  O dono roda lint e build. Typecheck e testes, sim.
- **Não faça commit, push, stash, reset nem checkout** por iniciativa
  própria. Só commite quando o dono pedir, e só com tudo pronto.
- Um ponto por vez: corrija, teste, valide e só então siga para o próximo.

## Mapa do código

```
src/app/(protected)/{admin,dashboard,driver}/<entidade>/  page.tsx + loading.tsx (finos)
src/app/(protected)/_components/   layout, tutoriais, alertas, DataTable, seletores com busca
src/app/(auth)/                    login, 2FA, recuperação de senha
src/app/app-routes/index.ts        FONTE ÚNICA de acesso (permissão, módulo, papéis) de toda página
src/app/api/{health,csp-report,relay}  health, relatório de CSP, relay same-origin (só GET)
src/app/{docs,blog,legal,acompanhar,verificar,…}  site público
src/features/<entidade>/           a tela da entidade (a MESMA para /admin e /dashboard)
src/actions/<domínio>/             Server Actions ("use server") que chamam a API
src/schemas/                       esquemas zod dos formulários (espelham a API)
src/env/                           env do servidor + configuração pública em runtime
src/lib/                           api-fetch, permissions, route-access, revalidation-tags, csp, sessão…
src/middleware.ts                  sessão, acesso por caminho, CSP com nonce
src/instrumentation.ts             recusa subir com variável faltando
src/content/{blog,legal,docs}/     MDX
tests/unitaires/                   Vitest (~380 arquivos)
tests/E2E/                         regras puras (Playwright, sem navegador)
tests/{ui,a11y,responsive}/        Playwright contra a stack
scripts/check-api-routes.mjs       gate de rotas do promote
.github/workflows/{ci,deploy,browser-suites}.yml
.github/scripts/{dokploy-webhook,wait-for-build}.mjs
```

## Convenções obrigatórias

**Idioma**

- Conversa, documentação, README, mensagens ao usuário e textos de UI em
  **português do Brasil, com acentuação correta**.
- **Comentários no código em inglês.** Títulos de teste (`it(...)`,
  `describe(...)`) em inglês.
- Commits seguem Conventional Commits (`feat(web): …`, `fix(web): …`,
  `chore(...)`), porque o semantic-release lê os commits.

**Configuração e ambiente**

- **Nunca crie uma variável `NEXT_PUBLIC_*`.** A imagem é uma só para staging
  e produção, e o Next embute `NEXT_PUBLIC_*` no build. Um valor que o
  navegador precisa entra em `src/env/names.ts` (`PUBLIC_ENV`), em
  `public-config.ts` e em `public-config-schema.ts`, e o cliente o lê por
  `src/env/client.ts` / `use-public-config.ts`. A única exceção é
  `NEXT_PUBLIC_BUILD_SHA`.
- Variável nova: documente em `.env.example` e em
  `docs/variaveis-de-ambiente.md`. Se for obrigatória, acrescente-a ao boot
  check (`src/env/server.ts`), com teste. Se for de runtime em staging e
  produção, acrescente-a também ao Environment da seção 6.2 de
  `docs/deploy.md` e cadastre-a nas Applications do Dokploy dos dois
  ambientes.
- Nunca escreva, imprima ou logue o valor de um segredo. Só o nome.

**Acesso e multiempresa**

- Toda página nova é registrada em `src/app/app-routes/index.ts`, com
  `requiredPermission` e `requiredModule` iguais aos da rota na API
  (`verifyModuleEnabled`). A sidebar, o ⌘K e o middleware derivam daí.
- A API é quem decide o acesso. A web só esconde ou desabilita, mostrando o
  motivo.
- No `/admin`, o escopo é a empresa escolhida. No `/dashboard`, é a empresa
  da sessão. A feature recebe isso como parâmetro, e não existem duas telas.

**Dados**

- Leitura de página: Server Component com `fetch` em
  `${process.env.HTTP_REQUEST}/…` e tags de `src/lib/revalidation-tags.ts`.
- Escrita: Server Action em `src/actions/<domínio>/<ação>/index.ts`. Ela lê
  `tkey` do cookie, valida com zod, chama `apiFetch` e revalida as tags. Uma
  recusa sempre volta com mensagem.
- Leitura no navegador: pelo relay `/api/relay/...` (acrescente o caminho a
  `src/lib/api-relay-paths.ts`). Nunca mande o token para o JavaScript da
  página.
- react-query v3: em seletor com `refetchOnMount: false`, use
  **`resetQueries`**, não `invalidateQueries` (motivo em
  `docs/arquitetura.md`). A chave leva tudo o que o `queryFn` lê.
- Uma rota da API que a web chama precisa existir na API de produção antes de
  a web ser promovida (o gate `check-api-routes` confere). Siga **expandir e
  depois contrair**.

**Telas** (padrão de página de listagem)

- `page.tsx` + `loading.tsx` fiel + conteúdo no servidor dentro de
  `Suspense`. `DataTable` com estado na URL e paginação por offset. Cartões e
  filtros contados no servidor. Botão **Revalidar/Atualizar** com rate limit
  (`use-revalidate-screen.ts`).
- Formulários: `Nome *` para obrigatório e `Nome (opcional)`; validação ao
  vivo (erro ao sair do campo, some quando corrige); Criar sempre
  habilitado; Salvar desabilitado enquanto nada mudou; ESC, X e Cancelar
  fecham; clique fora não fecha.
- Menu ⋮ (`RowActions`): 160 px, só texto, destrutivo em vermelho, sem
  permissão = desabilitado com o motivo.
- Tema claro e escuro: use os tokens do Tailwind, nunca uma cor fixa.

## Testes: regras

- Escreva o teste **antes**, veja-o **falhar** pelo motivo certo e só então
  corrija (vermelho → verde).
- Títulos em inglês. Um comentário em inglês no topo do `describe`
  explicando o defeito que o teste impede.
- Caminhos reais: rode o código de verdade (componente renderizado, script
  com `spawn` contra servidor falso no loopback, arquivo lido do disco).
  Mock só do que não dá para rodar.
- Ambiente padrão `happy-dom`. Para teste de arquivo, script ou servidor, use
  `// @vitest-environment node` na primeira linha.
- `tests/E2E` nunca usa as fixtures `page`/`context`/`browser`. Teste de tela
  vai para `tests/ui`.
- Mudou um workflow, o `Dockerfile`, a configuração da Application em
  `docs/deploy.md`, `src/env`, a CSP ou um doc
  citado por teste? Rode os testes que guardam isso (lista em
  `docs/testes.md`, seção "Testes que guardam a infraestrutura e a
  documentação").
- Cobertura é medida e publicada, sem piso: não acrescente `thresholds`.
- Ao terminar: `yarn typecheck` e os testes afetados (ou `yarn test:unit`
  inteiro).

## CI/CD em resumo

- `ci.yml`: push em branch de trabalho, PR para `main` e chamado pelo deploy
  (audit, Prettier, `yarn lint` com as regras do ESLint que o `next build`
  aplica, tsc, unitários com cobertura, regras, gitleaks).
- `browser-suites.yml`: `ui`, `a11y` e `responsive` contra a stack. Roda num
  push em staging (via deploy), num PR para main e toda noite. Pula sem
  `API_REPO_READ_TOKEN`.
- `deploy.yml`:
  - push em `staging` → validação → **um** build `sha-<commit>` → tag
    `staging` → webhook Dokploy → espera `/build-id.json` → marcador
    `staged-<commit>` (último passo);
  - push em `main` (merge commit de staging) → aprovação `production` → acha
    a imagem do commit de staging → exige `staged-<commit>` no mesmo digest
    → gate de rotas → tag `stable` **por
    digest** → webhook → espera `/build-id.json` → semantic-release;
  - Run workflow com `image_tag` = rollback (não exige o marcador).
- O job `release` faz push do `CHANGELOG.md` direto em `main`: o Ruleset de
  `main` precisa do app GitHub Actions na bypass list (`docs/deploy.md` §4).
- Nunca reconstrua para produção. Nunca use `latest`. Actions fixadas por
  SHA com a versão comentada (`supply-chain.test.ts`). Dependabot aponta para
  `staging`.
- Entre repositórios: a ordem do primeiro deploy (banco, Redis e IA → API →
  web → app), a ordem de cada release (**API → web → app**) e os valores que
  precisam casar com a API e o app (`HTTP_REQUEST`/`PUBLIC_API_URL` = URL da
  API, `RATE_LIMIT_FORWARDER_SECRET`, Turnstile, R2) estão em
  `docs/deploy.md` §20, "Os três repositórios juntos", igual nos três
  repositórios. Mudou ali, mude nos outros dois.

## Como adicionar uma funcionalidade de ponta a ponta

Exemplo: uma nova entidade "X" listada e editável no painel.

1. **API primeiro** (`trajetto-api`): rota, permissão, módulo e OpenAPI.
   Anote o caminho exato e a chave de permissão.
2. **Esquema:** `src/schemas/create-update-x-schema/` com zod, espelhando o
   da API, com mensagens em português.
3. **Actions:** `src/actions/x/{create-x,update-x,delete-x}/index.ts`
   (`"use server"`), seguindo `src/actions/branch/create-branch/index.ts`:
   token do cookie, `safeParse`, `apiFetch`, recusa com mensagem e
   revalidação da tag (acrescente a tag em `src/lib/revalidation-tags.ts`).
4. **Feature:** `src/features/x/` copiando a forma de uma existente
   (`src/features/vehicle-type`): `content/`, `table/`, `server-table.ts`,
   `form-dialog/`, `delete-dialog/`, `row-actions.tsx`, `page-actions/`,
   `stats/` e `types.ts`.
5. **Páginas:** `src/app/(protected)/dashboard/x/page.tsx` + `loading.tsx` e
   o mesmo em `admin/x/`. Só montam a feature, com o escopo.
6. **Acesso:** registre `/dashboard/x` e `/admin/x` em
   `src/app/app-routes/index.ts`, com `requiredPermission` e
   `requiredModule`.
7. **Leitura no cliente** (seletor com busca, se houver): em
   `_components/shared/searches/`, com o caminho no relay
   (`src/lib/api-relay-paths.ts`). Invalide com `resetQueries`.
8. **Tempo real** (se a API emitir `catalogChanged` para X): ligue em
   `src/lib/catalog-sync.ts`.
9. **Testes:** unitários do esquema, da action (o que vai para a API e como
   volta a recusa), do acesso (`app-routes`) e do componente. Se a tela
   precisa da API, um spec em `tests/ui`.
10. **Verificar:** `yarn typecheck` e `yarn test:unit`. Confira se
    `check-api-routes` acha a rota nova (`check-api-routes.test.ts`).
11. **Docs:** se mudou algo de arquitetura, env ou deploy, atualize o
    arquivo certo em `docs/`.

## O que não fazer

- Não use `NEXT_PUBLIC_` (exceto `NEXT_PUBLIC_BUILD_SHA`).
- Não leia `process.env` no código de cliente. Use `src/env/client.ts`.
- Não troque `resetQueries` por `invalidateQueries` em seletor.
- Não acrescente `userId` às chaves do react-query. O logout limpa tudo
  (`clear-session-state.ts`).
- Não troque a CSP para Report-Only, não acrescente `'unsafe-inline'` às
  páginas dinâmicas e não libere `*`.
- Não remova uma Server Action ou rota no mesmo release em que deixa de
  usá-la.
- Não crie job de build para produção nem rebuild no promote.
- Não ponha segredo em teste, doc ou log. O gitleaks roda no histórico
  inteiro.
- Não rode lint nem build. Não commite nem faça push sem pedido.
