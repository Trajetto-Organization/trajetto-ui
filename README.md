# Trajetto — Web

Painel web e site público do Trajetto. Este repositório contém:

- o painel das transportadoras (`/dashboard`);
- o painel da equipe Trajetto (`/admin`);
- as páginas do motorista no navegador (`/driver`);
- o site público, com blog e páginas legais em MDX;
- o portal de documentação da API (`/docs`);
- as páginas públicas de rastreio (`/acompanhar`) e de conferência de
  comprovante (`/verificar`).

> Software proprietário. Leia a [Licença](#licença) antes de copiar qualquer
> coisa deste repositório.

## Documentação

| Documento                                                        | Conteúdo                                                                                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/arquitetura.md`](docs/arquitetura.md)                     | stack, mapa do código, rotas, acesso, fluxo de dados, cache do react-query, tempo real, configuração em runtime, segurança e CSP, versão do build, contrato com a API, MDX e portal `/docs`, padrões de tela, tema e desempenho |
| [`docs/testes.md`](docs/testes.md)                               | suítes, comandos, o que cada uma prova, regras para escrever testes, cobertura, mutação e CI                                                                                                                                    |
| [`docs/deploy.md`](docs/deploy.md)                               | fluxo `staging` → `main`, workflows, GitHub, Dokploy (Application a partir do GHCR), primeiro deploy, promoção, rollback e solução de problemas                                                                                 |
| [`docs/variaveis-de-ambiente.md`](docs/variaveis-de-ambiente.md) | cada variável: para que serve, se é obrigatória, formato, valor por ambiente, se é segredo e onde configurar                                                                                                                    |
| [`tests/ui/README.md`](tests/ui/README.md)                       | como subir a stack local para as suítes de navegador                                                                                                                                                                            |
| [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)              | guia para agentes de IA trabalharem neste repositório                                                                                                                                                                           |

## O Trajetto em 1 minuto

O Trajetto é uma plataforma B2B (SaaS multiempresa) para transportadoras, com
dois módulos vendidos separadamente por empresa:

- **Frotas:** veículos, motoristas, abastecimentos com foto do odômetro,
  checklists, ordens de serviço, peças, fornecedores, multas, contas a pagar,
  filiais e Kanban.
- **Entregas:** documentos de entrega (manual, planilha ou XML de NF-e),
  embarcadores, rotas, torre de controle, monitoramento, ocorrências com
  autorização da torre, pausas do motorista, comprovante em PDF, atendimento
  por ticket com o motorista, mensagens ao cliente final e integrações (chaves
  de API e webhooks).

| Repositório (GitHub)                                      | O que é                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `trajetto-api`                                            | API (Fastify, Prisma, PostgreSQL, Redis), tempo real, filas, crons e o serviço local de IA/OCR |
| `trajetto-fleet-manager-ui` (este, pasta `trajetto-ui`)   | painel web, site público, blog e portal `/docs`                                                |
| `trajetto-fleet-manager-mobile` (pasta `trajetto-mobile`) | app do motorista, só Android (Expo)                                                            |

## Stack

Next.js 14 (App Router, React Server Components), Node.js 22, Tailwind CSS +
shadcn/ui sobre Radix, `@tanstack/react-table`, react-query v3, zod, zustand,
socket.io-client, Leaflet e MDX (`@mdx-js/mdx` + `gray-matter`). Os testes
usam Vitest 1.6 e Playwright, e a mutação usa Stryker. Detalhes em
[`docs/arquitetura.md`](docs/arquitetura.md).

## Rodando localmente

Pré-requisitos:

- Node.js 22 e Yarn 1 (o repositório usa `yarn.lock`);
- a API rodando (veja o README da `trajetto-api`), por padrão em
  `http://localhost:3333`.

```bash
# 1. Dependências
yarn install

# 2. Variáveis
cp .env.example .env
#    os valores do modelo já apontam para a API local.
#    RATE_LIMIT_FORWARDER_SECRET precisa ser o mesmo da API (ou vazio nos dois)

# 3. Servidor de desenvolvimento em http://localhost:3000
yarn dev
```

O usuário master é o do seed da API (`MASTER_USER_EMAIL` e
`MASTER_USER_INITIAL_PASSWORD`). Em desenvolvimento, o captcha não aparece e
o mapa usa o OpenStreetMap público.

O servidor confere as variáveis ao subir (`src/instrumentation.ts`) e **não
inicia** se faltar uma obrigatória, listando o nome de cada uma. A lista
completa está em
[`docs/variaveis-de-ambiente.md`](docs/variaveis-de-ambiente.md).

## Scripts

| Script                                                   | O que faz                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `yarn dev`                                               | servidor de desenvolvimento                                        |
| `yarn build` / `yarn start`                              | build e servidor de produção                                       |
| `yarn typecheck`                                         | `tsc --noEmit`                                                     |
| `yarn lint`                                              | ESLint do Next                                                     |
| `yarn lint:check` / `yarn lint:fix`                      | Prettier (o CI roda o `lint:check`)                                |
| `yarn test:unit`                                         | testes unitários (Vitest, `tests/unitaires`)                       |
| `yarn test:unit:watch`                                   | unitários em modo watch                                            |
| `yarn test:unit:coverage`                                | unitários com cobertura                                            |
| `yarn test:rules`                                        | regras puras de `tests/E2E` no runner do Playwright, sem navegador |
| `yarn test`                                              | Playwright sobre `tests/E2E` em Chromium, Firefox e WebKit         |
| `yarn test:headed` / `yarn test:ui` / `yarn test:report` | Playwright com navegador visível, modo interativo e relatório      |
| `yarn test:mutation`                                     | teste de mutação (Stryker)                                         |

As suítes de navegador contra a stack (`tests/ui`, `tests/a11y`,
`tests/responsive`) estão em [`docs/testes.md`](docs/testes.md).

## Deploy em uma tela

```
branch ─PR─▶ staging ─push─▶ validação completa ─▶ imagem única no GHCR (sha-<commit>)
                              ─▶ tag `staging` ─▶ Dokploy (staging)
staging ─PR─▶ main ─merge─▶ aprovação ─▶ mesma imagem, por digest ─▶ tag `stable` ─▶ Dokploy (produção)
```

- **Uma imagem só**, promovida de staging para produção. Tudo o que muda
  entre ambientes é lido em runtime (sem `NEXT_PUBLIC_*`).
- **API primeiro, web depois:** o promote confere se a API de produção serve
  todas as rotas que o build chama.
- **Rollback:** Actions → Deploy → Run workflow em `main` com
  `image_tag=sha-<commit bom>`.
- O passo a passo completo do Dokploy (Application, domínios, health check,
  webhooks, primeiro deploy) está em [`docs/deploy.md`](docs/deploy.md). A
  seção "Os três repositórios juntos" (igual nos três repositórios) traz a
  ordem do primeiro deploy (banco, Redis e IA → API → web → app), a ordem de
  cada release e os valores que precisam casar com a API e o app.

## Solução de problemas rápida

| Sintoma                               | Causa provável                                                                          | O que fazer                              |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| O servidor não sobe e lista variáveis | obrigatória faltando                                                                    | compare o `.env` com o `.env.example`    |
| Toda chamada falha com erro de rede   | API fora do ar ou `HTTP_REQUEST`/`PUBLIC_API_URL` errados                               | suba a API e confira as duas URLs        |
| Login funciona e o tempo real não     | `PUBLIC_SOCKET_URL` ou o CORS da API (o `HTTP_REQUEST` da API deve ser a URL desta web) | confira as duas pontas                   |
| 429 no login para todo mundo          | `RATE_LIMIT_FORWARDER_SECRET` diferente do da API                                       | use o mesmo valor nos dois               |
| Mapa sem fundo em staging ou produção | `MAP_TILE_URL` vazio                                                                    | configure um provedor de tiles comercial |

A tabela completa, com os problemas de deploy, está em
[`docs/deploy.md`](docs/deploy.md#19-solução-de-problemas).

## Licença

Software proprietário da Trajetto, com todos os direitos reservados. O acesso
e o uso dependem de assinatura ativa ou de autorização por escrito. Os termos
completos estão em [`LICENSE`](./LICENSE). O `package.json` declara
`"license": "UNLICENSED"` e `"private": true`.
