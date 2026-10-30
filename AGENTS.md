# AGENTS.md — trajetto-ui

Instruções para agentes de código (Codex, Cursor, Claude Code, Copilot e
outros) que trabalham neste repositório. O `CLAUDE.md` tem o mesmo conteúdo
essencial. Se os dois divergirem, vale o mais restritivo, e corrija o outro.

## Contexto em 30 segundos

- **Produto:** Trajetto, SaaS B2B multiempresa para transportadoras.
  Módulos: Frotas (`FLEET`) e Entregas (`DELIVERIES`).
- **Este repositório:** a web em Next.js 14 (App Router). Tem o painel
  logado (`/dashboard`, `/admin`, `/driver`), o site público com blog e
  páginas legais em MDX, o portal `/docs` da API e as páginas públicas
  `/acompanhar` e `/verificar`.
- **Sem banco:** tudo vem da `trajetto-api` por HTTP e Socket.IO.
- **Irmãos:** `../trajetto-api` (API, filas, IA/OCR) e `../trajetto-mobile`
  (app Android do motorista).
- **GitHub:** `Trajetto-Organization/trajetto-ui`. **Imagem:**
  `ghcr.io/trajetto-organization/trajetto-ui`. **Hospedagem:** Dokploy
  (Application puxando a imagem do GHCR) atrás do Traefik e da Cloudflare.

## Leitura obrigatória antes de mudar

| Vai mexer em…                                         | Leia                                             |
| ----------------------------------------------------- | ------------------------------------------------ |
| qualquer coisa                                        | este arquivo                                     |
| cache, sessão, acesso, CSP, env, MDX, padrões de tela | `docs/arquitetura.md`                            |
| testes                                                | `docs/testes.md`                                 |
| workflows, Dockerfile, Dokploy, deploy                | `docs/deploy.md`                                 |
| variáveis de ambiente                                 | `docs/variaveis-de-ambiente.md` e `.env.example` |
| suítes de navegador locais                            | `tests/ui/README.md`                             |

## Setup e comandos

Yarn 1 (`yarn.lock`), Node 22.

| Tarefa                   | Comando                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| instalar                 | `yarn install`                                                                                 |
| desenvolver              | `yarn dev` (API em `http://localhost:3333`, `.env` a partir do `.env.example`)                 |
| tipos                    | `yarn typecheck`                                                                               |
| unitários                | `yarn test:unit` ou `npx vitest run --dir tests/unitaires <filtro>`                            |
| cobertura                | `yarn test:unit:coverage`                                                                      |
| regras puras             | `yarn test:rules`                                                                              |
| mutação                  | `yarn test:mutation` (lento, gate `break: 90`)                                                 |
| navegador contra a stack | `npx playwright test -c playwright.{ui,a11y,responsive}.config.ts` (veja `tests/ui/README.md`) |

**Proibido para agentes neste repositório:**

- rodar `yarn lint`, `yarn lint:check`, `yarn build` ou `next build` (o dono
  roda);
- fazer commit, push, stash, reset ou checkout sem pedido explícito do dono;
- escrever, imprimir ou logar o valor de qualquer segredo.

## Idioma e estilo

- Documentação, README, textos de UI e mensagens de erro ao usuário em
  **português do Brasil, com acentos corretos**.
- **Comentários de código em inglês.** Títulos de testes em inglês.
- Commits no padrão Conventional Commits (`feat(web):`, `fix(web):`,
  `chore(deps):`), porque o semantic-release gera a versão a partir deles.
- Prettier é a fonte da formatação (`.prettierrc`).

## Arquitetura que você precisa respeitar

1. **Uma imagem para staging e produção.** Nada de ambiente no build.
   **Nunca** crie `NEXT_PUBLIC_*`. Os valores que o navegador precisa são
   lidos pelo servidor por requisição (`src/env/names.ts`,
   `public-config.ts`, `public-config-schema.ts`) e o cliente os lê por
   `src/env/client.ts`. Exceção única: `NEXT_PUBLIC_BUILD_SHA`.
2. **Boot estrito:** `src/instrumentation.ts` → `src/env/server.ts` recusa
   subir com variável obrigatória faltando ou inválida.
3. **Acesso numa fonte só:** `src/app/app-routes/index.ts`. Toda página tem
   `requiredPermission` e `requiredModule` iguais aos da API. A API é quem
   cobra; a web esconde ou desabilita com o motivo.
4. **Uma tela por entidade** em `src/features/<entidade>`, usada por
   `/admin` (empresa escolhida) e `/dashboard` (empresa da sessão).
5. **Dados:** leitura com `fetch` no servidor e tags de revalidação; escrita
   com Server Actions em `src/actions/`; leitura no navegador só pelo relay
   `/api/relay/...` (lista fechada em `src/lib/api-relay-paths.ts`). O token
   nunca vai para o JavaScript da página.
6. **react-query v3:** `resetQueries` em seletor com `refetchOnMount: false`.
   A chave leva tudo o que o `queryFn` lê. Nunca ponha `userId` na chave.
7. **CSP aplicada** com nonce (`src/lib/content-security-policy.ts`,
   `middleware.ts`). Origem nova = variável de ambiente certa
   (`MAP_TILE_URL`, `CSP_STORAGE_ORIGINS`, `PUBLIC_API_URL`), nunca `*`.
8. **Contrato com a API:** expandir e depois contrair. O promote roda
   `scripts/check-api-routes.mjs` contra o OpenAPI de produção. Rota ou
   Server Action não somem no mesmo release em que deixam de ser usadas.
9. **Versão do build:** `/build-id.json` + `DeploymentSkewGuard` avisam as
   abas antigas depois de um deploy.

## Padrões de tela

- Listagem: `page.tsx` + `loading.tsx` fiel + conteúdo no servidor em
  `Suspense`; `DataTable` com estado na URL (offset); totais e filtros no
  servidor; botão Revalidar com rate limit.
- Formulário: `Nome *` / `Nome (opcional)`; validação ao vivo; Criar sempre
  habilitado; Salvar desabilitado sem mudança; ESC, X e Cancelar fecham;
  clique fora não fecha.
- `RowActions`: 160 px, só texto, destrutivo em vermelho, desabilitado com o
  motivo.
- Tema claro e escuro só com tokens (`tailwind.config.ts`,
  `src/app/globals.css`).

## Testes

- Vermelho antes de verde: o teste novo precisa falhar antes da correção.
- Títulos em inglês. Um comentário em inglês no `describe` explicando o
  defeito evitado.
- Rode o código real (render, `spawn`, leitura do arquivo). Mock só do que
  não dá para rodar.
- `happy-dom` por padrão. `// @vitest-environment node` para testes de
  arquivo, script ou servidor.
- `tests/E2E` sem fixture de navegador. Tela com API vai para `tests/ui`.
- Vários testes guardam os workflows, o Dockerfile, a configuração da
  Application do Dokploy e os docs
  (lista em `docs/testes.md`). Mudou um desses arquivos? Rode os testes
  correspondentes.
- Cobertura é medida e publicada, sem piso. Não crie `thresholds`.

## CI/CD

| Workflow             | Quando                                                          | O quê                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`             | push em branch de trabalho, PR para `main`, chamado pelo deploy | audit-ci, Prettier, ESLint (`yarn lint`), tsc, unitários com cobertura, `test:rules`, gitleaks                                                                                        |
| `browser-suites.yml` | push em `staging` (pelo deploy), PR para `main`, sob demanda    | `ui`, `a11y`, `responsive` contra a stack (pula sem `API_REPO_READ_TOKEN`)                                                                                                            |
| `deploy.yml`         | push em `staging`                                               | validação → build único `sha-<commit>` (SBOM, proveniência, Trivy) → tag `staging` → deploy pela API do Dokploy → espera `/build-id.json` → `staged-<commit>`                         |
| `deploy.yml`         | push em `main` (merge commit de staging)                        | aprovação `production` → imagem do commit de staging com `staged-<commit>` → gate de rotas → tag `stable` por digest → deploy no Dokploy → espera `/build-id.json` → semantic-release |
| `deploy.yml`         | Run workflow em `main` com `image_tag`                          | rollback para qualquer tag imutável                                                                                                                                                   |

Regras: build uma vez, promover por digest; sem `latest`; actions fixadas por
SHA com a versão comentada; `packages: write` só nos jobs que publicam;
merges `staging` → `main` com merge commit (sem squash nem rebase).

Entre repositórios: ordem do primeiro deploy (banco, Redis e IA → API → web →
app), ordem de cada release (**API → web → app**) e os valores que precisam
casar com a API e o app estão em `docs/deploy.md` §20, "Os três repositórios
juntos", igual nos três repositórios.

## Receita: funcionalidade nova de ponta a ponta

1. Rota na API (permissão, módulo, OpenAPI).
2. Esquema zod em `src/schemas/`.
3. Server Actions em `src/actions/<domínio>/` (modelo:
   `src/actions/branch/create-branch/index.ts`), com tag nova em
   `src/lib/revalidation-tags.ts`.
4. Feature em `src/features/<entidade>/` (modelo: `src/features/vehicle-type`).
5. Páginas finas em `src/app/(protected)/{dashboard,admin}/<entidade>/`
   (`page.tsx` + `loading.tsx`).
6. Registro em `src/app/app-routes/index.ts`.
7. Seletor com busca? Caminho no relay e `resetQueries` na mutação.
8. Tempo real? `src/lib/catalog-sync.ts`.
9. Testes (esquema, action, acesso, componente; `tests/ui` se precisar da
   API).
10. `yarn typecheck` + testes. Docs atualizados se mudou arquitetura, env
    ou deploy.

## Checklist antes de dizer "pronto"

- [ ] `yarn typecheck` sem erros.
- [ ] Testes afetados (ou `yarn test:unit`) verdes. O teste novo foi visto
      falhando antes.
- [ ] Nenhum `NEXT_PUBLIC_` novo, nenhum segredo em código, teste ou doc.
- [ ] Página nova registrada em `app-routes`. Rota nova da API existe na API.
- [ ] Variável nova documentada no `.env.example` e em
      `docs/variaveis-de-ambiente.md`.
- [ ] Comentários em inglês. Textos e docs em pt-BR com acentos.
- [ ] Nada commitado sem pedido. Lint e build não foram rodados.
