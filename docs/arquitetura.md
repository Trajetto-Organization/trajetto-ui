# Arquitetura da web (`trajetto-ui`)

Este documento explica como a web do Trajetto é construída e por quê. Ele
reúne as decisões que valem para este repositório. A raiz do workspace também
tem documentos de decisão, mas eles não são versionados, então tudo o que um
leitor deste repositório precisa saber está aqui.

Documentos irmãos:

- [`testes.md`](./testes.md): como os testes são organizados e rodados.
- [`deploy.md`](./deploy.md): pipeline, Dokploy, staging, produção e
  rollback.
- [`variaveis-de-ambiente.md`](./variaveis-de-ambiente.md): cada variável,
  com o valor por ambiente.

## Sumário

- [O que é a web](#o-que-é-a-web)
- [Stack](#stack)
- [Mapa do código](#mapa-do-código)
- [Rotas e áreas](#rotas-e-áreas)
- [Quem vê o quê: papéis, permissões e módulos](#quem-vê-o-quê-papéis-permissões-e-módulos)
- [Fluxo de dados](#fluxo-de-dados)
- [Convenção de cache do react-query v3](#convenção-de-cache-do-react-query-v3)
- [Tempo real](#tempo-real)
- [Configuração pública em tempo de execução](#configuração-pública-em-tempo-de-execução)
- [Sessão e segurança](#sessão-e-segurança)
- [Content-Security-Policy](#content-security-policy)
- [Versão do build e abas abertas durante um deploy](#versão-do-build-e-abas-abertas-durante-um-deploy)
- [Contrato com a API: expandir e depois contrair](#contrato-com-a-api-expandir-e-depois-contrair)
- [Conteúdo em MDX e portal de documentação](#conteúdo-em-mdx-e-portal-de-documentação)
- [Padrões de tela](#padrões-de-tela)
- [Tema claro e escuro](#tema-claro-e-escuro)
- [Desempenho](#desempenho)
- [A imagem Docker](#a-imagem-docker)

## O que é a web

O Trajetto é um SaaS B2B multiempresa para transportadoras, com dois módulos
vendidos separadamente para cada empresa:

- **Frotas (`FLEET`)**: veículos, motoristas, abastecimentos com foto do
  odômetro, checklists, ordens de serviço, peças, fornecedores, multas, contas
  a pagar, filiais e Kanban.
- **Entregas (`DELIVERIES`)**: documentos de entrega (manual, planilha ou XML
  de NF-e), embarcadores, rotas, torre de controle, monitoramento, ocorrências
  com autorização da torre, pausas, comprovante em PDF, atendimento por ticket
  com o motorista, mensagens ao cliente final e integrações (chaves de API e
  webhooks).

São três repositórios:

| Repositório (GitHub) | Pasta local          | O que é                                                                                        |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `trajetto-api`       | `trajetto-api`       | API (Fastify, Prisma, PostgreSQL, Redis), tempo real, filas, crons e o serviço local de IA/OCR |
| `trajetto-ui`        | `trajetto-ui` (este) | painel web, site público, blog e portal `/docs`                                                |
| `trajetto-mobile`    | `trajetto-mobile`    | app Android do motorista (Expo)                                                                |

A web **não tem banco de dados próprio**. Todo dado vem da API por HTTP e
Socket.IO. O servidor Next só guarda o cache de dados dele, que é
descartável.

## Stack

| Camada                   | Escolha                                                            | Observação                                                   |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Framework                | Next.js 14.2 (App Router, React Server Components)                 | saída `standalone` (`next.config.mjs`)                       |
| Runtime                  | Node.js 22                                                         | imagem `node:22.21.1-alpine` fixada por digest               |
| UI                       | Tailwind CSS + shadcn/ui sobre Radix                               | `src/components/ui`                                          |
| Tabelas                  | `@tanstack/react-table` (`DataTable`)                              | paginação, ordenação e filtros no servidor, guardados na URL |
| Estado remoto no cliente | react-query **v3**                                                 | só onde a tela precisa de dado vivo                          |
| Estado local             | zustand                                                            | sessão, empresa escolhida, verificação por IA                |
| Formulários              | zod                                                                | os esquemas espelham os da API (`src/schemas`)               |
| Tempo real               | socket.io-client                                                   | `src/socket.ts`                                              |
| Mapas                    | Leaflet                                                            | torre, página da rota, seletor de local                      |
| Conteúdo                 | `@mdx-js/mdx` + `gray-matter`                                      | blog, páginas legais e guias do `/docs`                      |
| Outros                   | kbar (⌘K), sonner (toasts), react-turnstile (captcha), next-themes |                                                              |

## Mapa do código

```
src/
  app/
    (auth)/                 login, 2FA, recuperação de senha (force-dynamic)
    (protected)/
      admin/  dashboard/  driver/   páginas finas: page.tsx + loading.tsx
      _components/          layout (sidebar, navbar, tutoriais, alertas) e peças compartilhadas
        shared/searches/    seletores com busca no servidor (react-query)
        shared/tanstack-table/  DataTable e a leitura da URL (server-table.ts)
    app-routes/index.ts     registro de acesso de TODAS as páginas
    api/health              health check (o Docker e o Swarm usam)
    api/csp-report          recebe as violações da CSP
    api/relay/[...path]     relay de leitura same-origin (lista fechada, só GET)
    build-id.json/          commit do build que está servindo
    public-config.json/     configuração pública, para páginas pré-renderizadas
    docs/  blog/  legal/  acompanhar/  verificar/  sobre/  contato/  orcamento/ …
  features/<entidade>/      tela de cada entidade, a MESMA para /admin e /dashboard
  actions/<domínio>/        Server Actions que chamam a API
  components/               ui (shadcn), shared, mdx, site público (site/)
  content/                  blog/, legal/ e docs/ em MDX
  env/                      variáveis do servidor e configuração pública em runtime
  hooks/  lib/  providers/  schemas/  store/
  middleware.ts             sessão, acesso por caminho, CSP com nonce
  instrumentation.ts        confere as variáveis obrigatórias no boot
  socket.ts                 cliente Socket.IO
scripts/check-api-routes.mjs        gate de rotas usado no promote
.github/scripts/dokploy-webhook.mjs dispara o deploy no Dokploy
.github/scripts/wait-for-build.mjs  espera o site servir o build novo
```

As telas do `/admin` e do `/dashboard` são o mesmo componente em
`src/features/<entidade>`. O escopo entra como parâmetro: no `/admin`, a
empresa escolhida no seletor; no `/dashboard`, a empresa da sessão. Assim não
há dois formulários divergindo nem cartões calculados em lugares diferentes.

Uma feature típica (`src/features/vehicle-type`, por exemplo) tem:
`content/` (Server Component que busca os dados), `table/`, `form-dialog/`,
`delete-dialog/`, `page-actions/`, `row-actions.tsx`, `stats/`,
`server-table.ts` (o que vai da URL para a API) e `types.ts`. As páginas em
`src/app/(protected)/admin/<entidade>/page.tsx` e
`src/app/(protected)/dashboard/<entidade>/page.tsx` só montam essa feature.

## Rotas e áreas

| Caminho                                                                                                  | Para quem                      | O que tem                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `/`, `/gestao-de-frotas`, `/gestao-de-entregas`, `/sobre`, `/contato`, `/orcamento`, `/app-do-motorista` | público                        | site institucional, estático. `/about`, `/contact` e `/quote` respondem 308 para os nomes em português              |
| `/blog`, `/blog/[slug]`, `/feed.xml`                                                                     | público                        | artigos em MDX                                                                                                      |
| `/legal/[policy]`                                                                                        | público                        | Privacidade, Termos de Uso e Cookies                                                                                |
| `/docs`, `/docs/[slug]`, `/docs/referencia`, `/docs/console`                                             | público                        | portal da API: guias, referência e console                                                                          |
| `/acompanhar`                                                                                            | cliente final                  | rastreio público da entrega (token no caminho, `noindex`)                                                           |
| `/verificar/[token]`                                                                                     | quem tem o QR                  | conferência do comprovante em PDF (`noindex`)                                                                       |
| `/login` e telas de autenticação                                                                         | usuários                       | login, 2FA, recuperação de senha                                                                                    |
| `/dashboard/*`                                                                                           | usuários de uma transportadora | painel da empresa da sessão                                                                                         |
| `/admin/*`                                                                                               | `MASTER`                       | o mesmo painel para qualquer empresa escolhida, mais empresas, usuários master, limites, orçamentos e a aba Sistema |
| `/driver/*`                                                                                              | motorista no navegador         | veículos que dirige, contas a pagar, Kanban                                                                         |
| `/profile`, `/notifications`                                                                             | usuários                       | perfil (inclusive o som dos alertas) e notificações                                                                 |

`robots.txt` e `X-Robots-Tag` são decididos **por requisição** a partir de
`APP_ENV`: staging responde `Disallow: /`. Isso é o que permite a mesma imagem
servir os dois ambientes.

## Quem vê o quê: papéis, permissões e módulos

| Papel                                                | Na web                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `MASTER`                                             | `/admin`, escolhendo a empresa no seletor do topo                               |
| `BUSINESS_ADMIN`                                     | `/dashboard`, com tudo da própria empresa                                       |
| `BUSINESS_USER`                                      | `/dashboard`, com o que o perfil de acesso libera (leitura e escrita por chave) |
| motorista (`BUSINESS_USER` com vínculo de motorista) | `/driver`, com sidebar mínima                                                   |

**Uma fonte só decide o acesso:** `src/app/app-routes/index.ts`. Cada página
declara a permissão (`requiredPermission`), o módulo (`requiredModule`:
`FLEET` ou `DELIVERIES`) e, quando precisa, os papéis. Dessa fonte saem a
sidebar, a paleta ⌘K, as abas, os cartões de atalho, o bloqueio no
`middleware.ts` (`src/lib/route-access.ts`) e o estado das ações.

- Quem só tem leitura vê a tela. O que escreve aparece desabilitado, com o
  motivo. Exportar conta como escrita.
- Um módulo não contratado some da navegação. No `/admin`, a tela mostra
  "Módulo não contratado" e o caminho para habilitar.
- **Quem cobra de verdade é a API.** A web só decide o que vale mostrar. Os
  erros chegam com código (`PERMISSION_DENIED`, `MODULE_NOT_ENABLED`,
  `TENANT_INACTIVE`, `ROUTE_NOT_FOUND`, `ENDPOINT_RETIRED`), e cada um tem a
  sua mensagem.
- O `requiredModule` de uma página precisa espelhar o hook
  `verifyModuleEnabled` das rotas correspondentes na API.

## Fluxo de dados

- **Leitura de página:** um Server Component faz `fetch` no servidor contra
  `${process.env.HTTP_REQUEST}/…`, com tags de revalidação
  (`src/lib/revalidation-tags.ts`).
- **Escrita:** uma Server Action em `src/actions/<domínio>/` lê o token do
  cookie `tkey`, valida com o esquema zod, chama a API (`src/lib/api-fetch.ts`)
  e revalida as tags afetadas. Uma recusa sempre volta com mensagem
  (`src/lib/action-result.ts`, `src/lib/api-error.ts`).
- **Leitura no navegador:** o navegador não chama a API com token. Ele usa
  `/api/relay/...`, que lê o token do cookie HttpOnly no servidor e repassa só
  os caminhos da lista fechada em `src/lib/api-relay-paths.ts` (só GET, sem
  cache).
- `experimental.staleTimes.dynamic = 0` no `next.config.mjs`: voltar a uma
  aba não reaproveita um render antigo.
- **Logout** limpa o QueryClient e os stores (`src/lib/clear-session-state.ts`).
  Trocar de empresa no `/admin` reinicia a tela.

## Convenção de cache do react-query v3

O app tem muito mais `resetQueries` do que `invalidateQueries`. Isso parece
"marreta onde cabia alicate", mas é uma escolha deliberada. Trocar reset por
invalidate para "melhorar" quebraria os seletores.

### Por que `resetQueries` domina

Os seletores de busca declaram `refetchOnMount: false`. É isso que impede um
`<Select>` de disparar uma requisição toda vez que um formulário abre.

No react-query v3, `refetchOnMount: false` só é honrado **enquanto a query
ainda tem dado**. A decisão de buscar na montagem passa por
`shouldLoadOnMount`, que devolve verdadeiro quando `dataUpdatedAt` é 0,
independentemente da opção.

Foi isso que motivou a regra. Criar um embarcador e depois abrir o formulário
de entrega não mostrava o embarcador novo.
`invalidateQueries(["shipper"])` marcava a query como obsoleta, mas o dado
continuava lá, e com `refetchOnMount: false` o seletor o servia como estava.
`resetQueries(["shipper"])` derruba o dado, `dataUpdatedAt` volta a zero e a
próxima montagem é obrigada a buscar. Isso foi verificado com a build real do
`react-query@3.39.3` em Node: antes, `fetches: 1 → 1, status: error`; depois,
`1 → 2, status: success`.

Refetchar em segundo plano também não adianta. Um refetch inativo reaproveita
o closure do `queryFn` do último observer que buscou, e esse closure rejeita
assim que o componente desmonta.

### A regra

| Use                     | Quando                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`resetQueries`**      | O alvo é um seletor de busca (qualquer coisa em `_components/shared/searches/**`) ou qualquer query com `refetchOnMount: false`. É a única forma que funciona com essas opções. Use também quando o conjunto mudou de identidade, e não só de conteúdo. |
| **`invalidateQueries`** | O alvo é uma query montada e visível, com as opções padrão. Ela é marcada como obsoleta e refeita em segundo plano, sem tirar o que está na tela. É o que se quer numa tabela aberta.                                                                   |
| **`setQueryData`**      | A resposta da própria mutação já trouxe o valor novo e confiável. Evita a ida ao servidor. Use só quando a resposta traz o registro completo.                                                                                                           |
| **`clear`**             | A sessão acabou. Há um lugar só para isso: `src/lib/clear-session-state.ts`.                                                                                                                                                                            |
| **`removeQueries`**     | Praticamente nunca. `resetQueries` cobre o caso e mantém as opções da query.                                                                                                                                                                            |

`resetQueries(["shipper"])` e `resetQueries({ queryKey: [...] })` são
equivalentes. Padronizar a forma é uma varredura mecânica à parte, nunca
misturada com correção de bug.

### Chaves

Toda chave carrega o escopo de que o `queryFn` depende. Três chaves parecem
não ter escopo, e não são bug:

- `["business"]` e `["traffic_violation_code"]`: dados que não pertencem a
  nenhuma transportadora. A lista de empresas é do `MASTER`, e a tabela de
  infrações é do DETRAN.
- `["account-payables-by-responsible-user"]`: o `businessId` não entra na
  chave porque também não entra na requisição. O backend o tira do token.

O id do usuário não entra em chave nenhuma. Isso não é descuido: é por isso
que o `clear()` no logout é obrigatório, e o motivo está explicado em
`src/lib/clear-session-state.ts`. Não tente consertar acrescentando `userId`
às chaves. Seriam dezenas de lugares para errar, e a limpeza no logout
resolve o problema inteiro num lugar só.

### Ao adicionar uma query

1. A chave contém tudo o que o `queryFn` lê. Se ele lê `search`, a chave leva
   `search`.
2. Se a query declarar `refetchOnMount: false`, quem invalida esse dado usa
   `resetQueries`. Escreva isso no lugar onde a mutação acontece.
3. Dado sensível não precisa de tratamento especial na chave. Precisa que
   `clearSessionState` continue sendo chamado no logout, e isso tem teste.

## Tempo real

- O cliente Socket.IO (`src/socket.ts`) conecta em `PUBLIC_SOCKET_URL`. Sem
  ela, conecta em `PUBLIC_API_URL`.
- O evento `catalogChanged` da API invalida as listas daquela entidade em
  todas as sessões abertas (`src/lib/catalog-sync.ts`).
- Torre de controle, monitoramento, rotas, chat e alertas de ocorrência
  também escutam o socket (`src/hooks/use-route-events.ts`,
  `use-operations-subscription.ts`, `use-presence-list.ts`).
- O balão de alertas no canto inferior direito avisa de ocorrências, pedidos
  de autorização e mensagens de ticket. O som é configurável por usuário no
  perfil.
- Na torre, um aviso diz que só aparece motorista com o app aberto.
  `BACKGROUND_TRACKING=true` tira esse aviso, e deve ser ligada junto com o
  rastreio em segundo plano do app (`EXPO_PUBLIC_BACKGROUND_TRACKING`).

## Configuração pública em tempo de execução

**Decisão 12.2: uma imagem só, construída uma vez e promovida de staging para
produção.** O Next substitui cada `process.env.NEXT_PUBLIC_*` pelo valor do
momento do build, inclusive no servidor e no middleware. Se a URL da API fosse
`NEXT_PUBLIC_`, a imagem de staging levaria a URL de staging para a produção.

Por isso:

- As variáveis que o navegador precisa **não** têm o prefixo `NEXT_PUBLIC_`:
  `PUBLIC_API_URL`, `PUBLIC_SOCKET_URL`, `TURNSTILE_SITE_KEY`, `MAP_TILE_URL`,
  `MAP_TILE_ATTRIBUTION`, `MAP_TILE_URL_DARK`, `MAP_TILE_ATTRIBUTION_DARK`,
  `METADATA_BASE` e `APP_ENV` (nomes em `src/env/names.ts`).
- O servidor as lê **por requisição** (`src/env/public-config.ts`) e as
  entrega à página num `<script>` JSON escapado
  (`src/env/public-config-script.tsx`). Páginas pré-renderizadas buscam a
  mesma configuração em `/public-config.json`.
- O código de cliente lê esses valores por `src/env/client.ts` /
  `use-public-config.ts`, nunca por `process.env`.
- O esquema estrito (zod) fica em `src/env/public-config-schema.ts`, só no
  servidor. O leitor do navegador (`readPublicConfig`) não usa zod, para não
  pesar no bundle de toda página, e os testes garantem que os dois dão as
  mesmas respostas.
- **Boot:** `src/instrumentation.ts` chama `assertWebEnv`
  (`src/env/server.ts`). Se faltar uma obrigatória, ou se alguma for
  inválida, o servidor **não sobe** e lista no log o nome de cada uma (nunca
  o valor). Em produção, ele sai com código 1, e o Swarm mantém a versão
  antiga.
- A única `NEXT_PUBLIC_` que sobrou é `NEXT_PUBLIC_BUILD_SHA`, gerada pelo
  `Dockerfile` a partir do commit. Ela é a mesma em qualquer ambiente.

Nomes antigos que não existem mais (o erro de boot cita o substituto):
`NEXT_PUBLIC_HTTP_REQUEST` → `PUBLIC_API_URL`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` → `TURNSTILE_SITE_KEY`,
`NEXT_PUBLIC_MAP_TILE_URL` → `MAP_TILE_URL`,
`NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` → `MAP_TILE_ATTRIBUTION`.

## Sessão e segurança

- A sessão fica nos cookies `httpOnly` `tkey` (acesso) e `rkey` (refresh),
  renovados no servidor (`src/lib/session-renewal.ts`,
  `session-cookie-options.ts`).
- O `middleware.ts` confere a sessão e o acesso por caminho antes de
  renderizar, renova um token vencido e monta a CSP.
- Login, 2FA, recuperação de senha, refresh e rastreio público chamam a API a
  partir do servidor da web. Essas chamadas levam
  `RATE_LIMIT_FORWARDER_SECRET` (`src/lib/api-forwarding.ts`) para a API
  contar cada navegador pelo próprio endereço, e não todos pelo endereço do
  servidor da web. O valor precisa ser **o mesmo** da API.
- O Turnstile (Cloudflare) protege login, recuperação de senha e orçamento.
  Num servidor de produção, ele é obrigatório.
- Cabeçalhos fixos em `next.config.mjs`: HSTS com `preload`,
  `X-Robots-Tag: noindex` nas páginas com token (`/verificar`, `/acompanhar`),
  e nenhum `X-Powered-By`.

## Content-Security-Policy

A CSP é montada por requisição em `src/lib/content-security-policy.ts` e
enviada pelo `middleware.ts` no cabeçalho **`Content-Security-Policy`**. Ela é
aplicada de verdade, não é Report-Only.

- **Nonce** nas páginas renderizadas por requisição (área logada,
  autenticação): o Next lê o nonce da CSP da requisição e o carimba nos
  próprios scripts.
- **Páginas pré-renderizadas** (landing, blog, legais, decisão 10.4) vêm do
  cache, sem nonce. Elas recebem a mesma política com `'unsafe-inline'` em
  `script-src`. O HTML delas é fixo no build e não tem nada da requisição nem
  de um tenant. O resto continua valendo: sem eval, sem plugins, sem `<base>`,
  sem frames, sem scripts de hosts fora da lista.
- O script de tema (`src/lib/theme-init-script.ts`) entra pelo **hash**.
- **Origens liberadas:** a API (`PUBLIC_API_URL`), o socket
  (`PUBLIC_SOCKET_URL`), o storage das URLs pré-assinadas
  (`CSP_STORAGE_ORIGINS`, por padrão `https://*.r2.cloudflarestorage.com`), os
  hosts dos tiles (lidos de `MAP_TILE_URL` e `MAP_TILE_URL_DARK`), o Turnstile
  (`https://challenges.cloudflare.com`), `nominatim.openstreetmap.org` e
  `viacep.com.br`.
- **`report-uri /api/csp-report`**: cada violação vira **uma** linha
  `console.error` no log do contêiner. A rota corta query strings e segmentos
  opacos do caminho (as páginas públicas levam o token no caminho), limita o
  corpo a 16 KB e registra no máximo 60 linhas por minuto por instância. Uma
  linha ali é um ataque bloqueado ou uma página que a política quebrou. Leia
  sempre depois de um deploy.

## Versão do build e abas abertas durante um deploy

Três coisas davam errado em todo deploy e só passavam quando a pessoa
apertava F5:

| O que acontecia                                                          | Por quê                                                                                                                       | O que cobre agora                                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Tela com 404 depois da promoção da web                                   | A web nova chamava uma rota que a API de produção ainda não tinha, ou a web velha chamava uma rota que a API nova tirou       | Ordem **API primeiro** + o gate `scripts/check-api-routes.mjs` no promote |
| Formulário respondendo "Erro inesperado" numa aba aberta antes do deploy | A Server Action da aba não existe no build novo. O Next 14 responde com a página de not-found, e a action resolve `undefined` | `DeploymentSkewGuard` avisa e recarrega na próxima navegação              |
| Tela que não abre (ChunkLoadError) numa aba antiga                       | O contêiner novo só tem o `.next/static` do próprio build                                                                     | `ErrorSurface` e o guard recarregam a página uma vez por build            |

Como funciona:

- O `deploy.yml` passa `GIT_SHA=${{ github.sha }}` para o **único** build. O
  `Dockerfile` o transforma em `NEXT_PUBLIC_BUILD_SHA`, e
  `/build-id.json` devolve `{"sha":"<commit>"}`. Esse caminho tem extensão,
  então não passa pelo middleware e nunca renova uma sessão por trás.
- A aba (`src/components/shared/deployment-skew-guard`,
  `src/lib/deployment-skew.ts`) compara os dois valores quando volta a ficar
  visível, quando ganha foco e a cada 5 minutos, no máximo uma vez por
  minuto. Se forem diferentes, aparece o toast persistente "Uma nova versão do
  Trajetto foi publicada", com **Recarregar**, e a próxima navegação faz uma
  carga completa. Uma página em que alguém pode estar digitando nunca é
  recarregada sozinha.
- Um build sem `GIT_SHA` (local, `next dev`) desliga a comparação.
- O pipeline usa o mesmo `/build-id.json` para provar que o deploy trocou a
  versão (`.github/scripts/wait-for-build.mjs`, veja `deploy.md`).

Sticky session e `deploymentId` **não** resolvem nada disso aqui. O cookie
de afinidade pode prender a pessoa justamente na réplica velha, a web tem uma
réplica só, e o `deploymentId` do Next self-hosted só acrescenta `?dpl=`.
Nenhum servidor roteia por build sem a infraestrutura da Vercel.

**Limite:** o guard só existe a partir do build que o contém. As abas abertas
num build anterior a ele não têm como perceber o deploy.

## Contrato com a API: expandir e depois contrair

Web e API são promovidas por pipelines diferentes. Por isso, uma rota da API
que a web usa não pode sumir no mesmo release em que a web para de usá-la:

1. **Release N (expandir):** a API ganha a rota nova, e a web passa a usá-la.
   A rota velha continua respondendo.
2. **Release N+1 (contrair):** só depois que a web N saiu do ar, a API tira a
   rota velha e a acrescenta à tabela `RETIRED_ROUTES`
   (`trajetto-api/src/routes/retired-routes.ts`). A partir daí, ela responde
   `410` com `{ "code": "ENDPOINT_RETIRED", "message": "…", "replacement"?: "MÉTODO /rota" }`
   (e o header `x-error-code: ENDPOINT_RETIRED`), e cada chamada gera a linha
   de log `Retired endpoint called`. A web trata o código como falha de
   contrato, igual a `ROUTE_NOT_FOUND`.
3. **Remover o tombstone:** só quando os logs passarem um release inteiro sem
   `Retired endpoint called` para aquela rota.

A regra vale também para as Server Actions da web. Uma action removida faz as
abas abertas antes do deploy falharem até recarregar. Mantenha a action por
um release, respondendo uma mensagem clara.

O que garante isso no pipeline: `scripts/check-api-routes.mjs` lê todo
`${process.env.HTTP_REQUEST}/…`, `${await publicApiUrl()}/…` e
`relayUrl("/…")` de `src/` e confere cada formato de caminho contra o
`paths` do OpenAPI da API de produção (`/docs/json`). Ele não compara métodos
nem corpos. É um piso. O lado da API tem o teste equivalente,
`trajetto-api/tests/unitaires/contract/client-routes.test.ts`, que lê este
repositório.

## Conteúdo em MDX e portal de documentação

Não há CMS. Todo conteúdo é MDX dentro de `src/content/`:

| Pasta                     | Vira                                                    | Observações                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/blog/*.mdx`  | `/blog/<slug>`                                          | sem imagens. A imagem de compartilhamento é gerada por post (`opengraph-image.tsx`), só texto. Assinatura "Equipe Trajetto"                                          |
| `src/content/legal/*.mdx` | `/legal/privacidade`, `/legal/termos`, `/legal/cookies` | escritas a partir do comportamento real do produto. `tests/unitaires/legal-facts.test.ts` confere cada prazo e cada terceiro contra o código da API, do app e da web |
| `src/content/docs/*.mdx`  | `/docs/<slug>`                                          | guias da API pública (`visao-geral`, `comeco-rapido`, `autenticacao`, `paginacao`, `idempotencia`, `erros`, `limites`, `webhooks`, `assinatura`, `changelog`)        |

O frontmatter do blog é validado por `src/lib/content/frontmatter.ts`:

```yaml
---
title: "Título do artigo"
description: "Resumo de uma ou duas frases."
slug: "titulo-do-artigo"
date: "2026-10-06"
category: "operacao" # uma das categorias de src/content/blog/categories.ts
tags: ["rotas", "torre de controle"]
author: "Equipe Trajetto"
---
```

**Portal `/docs` e o OpenAPI da API (decisões 11.1 e 11.2):**

- `/docs/referencia` é renderizada no servidor a partir de
  `GET ${HTTP_REQUEST}/integration/docs/openapi.json`
  (`src/app/docs/_lib/public-spec.ts`). Nada da referência é escrito à mão.
  O documento passa pelo cache de dados do Next com `revalidate` de 300 s
  (o mesmo `max-age` que a API manda) e timeout de 8 s.
- Se a API não responder, a página diz isso e mostra o link para o documento
  bruto, em vez de uma cópia velha.
- Os links que o navegador segue (o JSON bruto, o console) usam o `servers`
  do próprio documento. `PUBLIC_API_URL` é só o fallback.
- `/docs/console` redireciona (307) para o console interativo da API,
  `<API>/integration/docs`.
- Os exemplos dos guias usam `TRAJETTO_API_URL`, `TRAJETTO_API_KEY` e
  `TRAJETTO_WEBHOOK_SECRET`. Essas variáveis são do **cliente da API**, não
  desta web. Os testes `docs-portal-samples.test.ts` executam os exemplos.

O OpenAPI público (`/integration/docs/openapi.json`) não é o mesmo documento
interno `/docs/json`. O interno é protegido por Basic auth (`DOCS_USER` e
`DOCS_PASSWORD` da API) e só o gate de rotas do promote o usa.

## Padrões de tela

Toda página de listagem segue a mesma anatomia:

- `page.tsx` (Server Component) + `loading.tsx` fiel ao layout + um
  `*-content` no servidor dentro de `Suspense`.
- `DataTable` com página, ordenação, busca e filtros na URL (`searchParams`).
  Os cartões de totais e os filtros são contados no servidor, nunca sobre a
  página carregada.
- Ações da página (`PageActions`) com **Revalidar**, que tem rate limit e
  escopo global da aba (`src/hooks/use-revalidate-screen.ts`). Ele
  re-renderiza o servidor, descarta as consultas inativas do react-query e
  refaz as ativas.
- No `/admin`, os botões ao lado do seletor de empresa têm a altura dele
  (`h-10`) e, no celular, empilham em largura total.
- Sem empresa escolhida, todas as telas mostram o mesmo estado vazio
  (`SelectBusinessEmptyState`).
- Menu ⋮ das linhas (`RowActions`) com 160 px, só texto, ação destrutiva em
  vermelho e item sem permissão desabilitado com o motivo.

Formulários e modais:

- Obrigatório = `Nome *` (asterisco vermelho). Opcional = `Nome (opcional)`.
- **Validação ao vivo:** o erro aparece quando a pessoa sai do campo e some
  assim que o valor fica certo. Regras de negócio (quilometragem menor que a
  última do veículo, por exemplo) aparecem na hora. O campo fica vermelho, e a
  mensagem aparece embaixo, em até duas linhas, com `aria-invalid` e
  `aria-describedby`.
- O botão Criar continua habilitado. Na edição, Salvar fica desabilitado
  enquanto nada mudou (`src/hooks/use-form-dirty.ts`).
- ESC, X e Cancelar fecham o modal. Clique fora não fecha. Modal pequeno tem
  Cancelar e a ação principal lado a lado (`DialogFormFooter`).
- Datas com o ícone de calendário no fim (`DatePickerField`). Data e hora em
  `DateTimePickerField`, que envia ISO com deslocamento. Datas sem hora são
  exibidas em UTC, sem hora.
- Abas com rolagem horizontal, bordas esmaecidas e setas (`ScrollableTabs`).
- Criações idempotentes: `src/lib/idempotency-key.ts` e
  `src/hooks/use-idempotency-key.ts`.

Tutoriais: `src/app/(protected)/_components/layout/protected-tutorial`, com
âncoras `data-tutorial`, rolagem até o alvo e, no celular, um painel embaixo
da tela.

## Tema claro e escuro

- O site público (`src/components/site`) e o app logado têm tema claro e
  escuro, com `next-themes` (`src/providers/theme-provider`). As cores são
  tokens em `tailwind.config.ts` e `src/app/globals.css`.
- O script que aplica o tema antes da pintura (`src/lib/theme-init-script.ts`)
  entra na CSP pelo hash.
- Mapas: com tema escuro, a web usa `MAP_TILE_URL_DARK` se ela existir
  (decisão 16.123). Sem ela, o mapa claro é recolorido por um filtro CSS.
- A fonte do app é a Inter (`tests/unitaires/font-app-inter.test.ts`).

## Desempenho

O que se mediu na build de produção e ficou travado por teste:

- **Primeira carga de cada rota:** o que não é preciso na primeira pintura é
  chunk separado, carregado quando a tela precisa. Isso vale para os textos e
  o motor dos tutoriais no layout logado, os painéis de cada aba de Entregas,
  as zonas de upload de foto (react-dropzone), o recorte de avatar do perfil,
  o detalhe da entrega e todo mapa Leaflet. `tests/unitaires/client-bundle-boundaries.test.ts`
  lê o grafo de imports e falha se um import estático trouxer esse peso de
  volta.
- **Layout shift do captcha:** o widget do Turnstile monta meio segundo
  depois da página. O markup do servidor agora reserva a altura dele, e isso
  tirou o deslocamento de 0,10 medido no `/login`
  (`tests/unitaires/captcha-layout-shift.test.tsx`).
- **zod fora do bundle público:** `src/env/public-config.ts` não importa zod
  (só ele custava ~12,7 KB gzip em toda página).
- **Treemaps:** `ANALYZE=true yarn build` grava os relatórios do
  `@next/bundle-analyzer` em `<distDir>/analyze/`, sem abrir o navegador.
  `NEXT_DIST_DIR` permite uma build de produção ao lado do `next dev` sem um
  sobrescrever o outro. Essa medição é feita pelo dono, porque builds não
  rodam nas sessões de agente.
- Imagens: `images.formats` com AVIF e WebP. O otimizador usa o `sharp`
  (variante musl na imagem Alpine).

## A imagem Docker

`Dockerfile` em três estágios:

1. **base:** `node:22.21.1-alpine` fixada por digest, com `ca-certificates`
   e `dumb-init`.
2. **builder:** `yarn install --frozen-lockfile` com cache, depois
   `yarn build`. Os únicos build args são `METADATA_BASE` (a origem de
   **produção**, impressa nos canonicals das páginas pré-renderizadas; staging
   nunca é indexado) e `GIT_SHA`. O par glibc do `sharp` (~17 MB) é removido
   antes da cópia. **Se a base voltar a Debian, tire esse passo**, ou o
   otimizador de imagens quebra.
3. **runner:** usuário `nextjs` (uid 1001), `PORT=3000`, `HOSTNAME=0.0.0.0`,
   `NEXT_TELEMETRY_DISABLED=1`, saída `standalone` (`node server.js` sob
   `dumb-init`) e `HEALTHCHECK` com `wget` do busybox em
   `http://127.0.0.1:3000/api/health` (intervalo de 30 s, start de 60 s, 3
   tentativas). O `wget` gasta ~1 MB por sonda; um `node -e` gastaria ~52 MB.

Em staging e produção a imagem roda como **Application** do Dokploy
(provider Docker, imagem do GHCR), um serviço do Swarm atrás do Traefik. As
Swarm Settings da Application trocam os tempos do health check (start de
120 s, 5 tentativas) com o mesmo comando, e definem o update `start-first`
com rollback automático, o restart sem limite e o teto de memória
(`deploy.md`, seção 6.4).

As imagens são **amd64**. Numa VPS ARM, seria preciso build multiarquitetura
(`platforms:` no `build-push-action`) e tirar a remoção do `sharp` x64.
