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
- [Next.js 14: versão e avisos de segurança](#nextjs-14-versão-e-avisos-de-segurança)
- [Versão do build e abas abertas durante um deploy](#versão-do-build-e-abas-abertas-durante-um-deploy)
- [Contrato com a API: expandir e depois contrair](#contrato-com-a-api-expandir-e-depois-contrair)
- [Conteúdo em MDX e portal de documentação](#conteúdo-em-mdx-e-portal-de-documentação)
- [Padrões de tela](#padrões-de-tela)
- [Tabelas: filtros, requisições e modo local](#tabelas-filtros-requisições-e-modo-local)
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
| Runtime                  | Node.js 22                                                         | binário da `node:22.21.1-alpine3.23` sobre `alpine:3.23.7`   |
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
    api/relay/[...path]     relay same-origin (lista fechada: leituras e downloads em GET, as duas importações em POST)
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
.github/scripts/dokploy-deploy.mjs dispara o deploy no Dokploy
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
  (`src/lib/action-result.ts`, `src/lib/api-error.ts`). A revalidação fica
  **dentro da própria action** de escrita: a resposta dela já traz a tela
  re-renderizada, numa ida só. O diálogo não chama mais uma segunda action
  (`revalidateTagName`) depois de salvar, o que custava outra ida e outro
  render inteiro do layout (o cache de dados está desligado, então a tag em si
  não limpa nada); ele só atualiza os seletores do react-query.
- **Leitura no navegador:** o navegador não chama a API com token. Ele usa
  `/api/relay/...`, que lê o token do cookie HttpOnly no servidor e repassa só
  os caminhos da lista fechada em `src/lib/api-relay-paths.ts` (GET, sem
  cache). O corpo passa em fluxo, pedaço por pedaço.
- **Leituras das telas no react-query** (`queryFn`) também vão pelo relay
  (`src/lib/relay-read.ts`), **nunca por Server Action**. O router do Next 14
  roda Server Actions uma de cada vez (`router.refresh()` entra na mesma
  fila), e uma navegação descarta as que estavam esperando, com promessas que
  nunca terminam: as leituras que uma tela disparava "juntas" viravam uma
  corrente, e uma query ficava presa em "carregando". Pelo relay elas saem em
  paralelo, são canceladas pelo `signal` do react-query e falham com o status
  HTTP de verdade. Server Action fica para escrita (e para o ticket do
  Socket.IO, que é POST e tem prazo em `src/socket.ts`). O Sistema, por
  exemplo, lê provedores e métricas lado a lado, e o "Atualizar" dessa aba
  refaz só essas duas consultas (os provedores com `refresh=true`), sem
  re-renderizar o `/admin` inteiro.
- **Exportações** (os nove botões Exportar e o modelo da planilha) também vão
  pelo relay, em GET: o navegador baixa o arquivo, monta o `Blob` e salva
  (`src/lib/export-download.ts`, `src/lib/export-requests.ts`). Antes era uma
  Server Action que lia o arquivo inteiro na memória do Next, devolvia em
  base64 e o navegador decodificava byte a byte: ~4,5× o arquivo num heap de
  512 MB. Dez exportações de 17 MB ao mesmo tempo derrubavam o contêiner, um
  arquivo acima de ~400 MB nunca baixava, e fechar a aba não parava a API. O
  relay repassa `content-disposition`, `x-total-records`, `retry-after` e o
  `content-length` (quando o corpo não veio codificado), e cancela a chamada à
  API quando a aba fecha. A recusa mostra a frase da API (429 `EXPORT_BUSY`
  com o tempo do `Retry-After`).
- **Importações** (planilha e XML de NF-e) vão pelo relay em **POST**, com o
  mesmo JSON da API (arquivo em base64). Uma Server Action aceita no máximo
  1 MB de corpo no Next 14, e a tela promete planilhas de 6 MB e 25 XMLs de
  512 KB. O POST do relay só aceita os dois caminhos de `RELAY_UPLOAD_PATHS`,
  JSON, mesma origem (`Sec-Fetch-Site` ou `Origin`), e o teto de corpo da
  própria API. Quando a API responde **202** (a importação roda em segundo
  plano), o diálogo acompanha `GET /import/get-import/:importId/business/:businessId`
  até sair de `IN_PROGRESS`, mostrando quantas linhas já foram processadas; o
  diálogo pode ser fechado nessa fase (a aba Importações acompanha). O `200`
  síncrono antigo continua sendo lido, então a ordem de deploy da API e da web
  não importa.
- `experimental.staleTimes.dynamic = 30` no `next.config.mjs` (**decisão 2.4,
  revista**): o router do navegador guarda o render de uma página dinâmica por
  30 s, por aba e por URL — o padrão do Next, que a produção sempre usou. Com
  `0`, cada volta a uma página, cada clique no menu e cada busca repetida era
  um render novo no servidor. O frescor não depende dessa janela: toda
  mutação revalida, e a resposta da action derruba o cache inteiro do router;
  "Atualizar", os eventos de tempo real (`use-route-events`, a fila de
  ocorrências) e uma mudança de acesso chamam `router.refresh()`, que também
  o derruba. O que os 30 s podem mostrar é a mudança **de outra pessoa**, sem
  evento de tempo real, numa página que esta aba viu há menos de 30 s — até o
  "Atualizar", que a decisão 2.3 já define como o gesto garantido. Voltar e
  avançar no navegador restauram do cache do router com qualquer valor.
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

### Padrões do QueryClient

`src/lib/query-client-props.ts`:

- **`retry`: uma tentativa a mais, e só para falha passageira** (nada
  respondeu, ou 5xx; `isTransientQueryError`), depois de 1 s. Antes eram três,
  com 1 + 2 + 4 s, para qualquer erro sem status 4xx, e a recusa de uma
  Server Action nunca tem status: uma leitura que falhava segurava o spinner
  ~7 s e, enquanto isso, a fila de actions do Next. A leitura pelo relay
  falha com o status real (`RelayReadError`), então um 4xx nunca é repetido.
- **`keepPreviousData: false`**: uma query com a empresa na chave não mostra,
  nem por um instante, os dados da empresa anterior enquanto a nova carrega.
  Lista paginada ou com busca que quer segurar as linhas liga a opção na
  própria query, e a tela é remontada por empresa (`key={businessId}`).

### Ao adicionar uma query

1. A chave contém tudo o que o `queryFn` lê. Se ele lê `search`, a chave leva
   `search`.
2. Se a query declarar `refetchOnMount: false`, quem invalida esse dado usa
   `resetQueries`. Escreva isso no lugar onde a mutação acontece.
3. Dado sensível não precisa de tratamento especial na chave. Precisa que
   `clearSessionState` continue sendo chamado no logout, e isso tem teste.
4. O `queryFn` lê pelo relay (`relayJson`/`relayNdjson` de
   `src/lib/relay-read.ts`, com `relayUrl("/caminho/literal")` e o `signal`
   do react-query), e o caminho entra em `src/lib/api-relay-paths.ts`. Nunca
   uma Server Action: `tests/unitaires/api-relay.test.ts` confere que todo
   `relayUrl` do código está na lista.

## Tempo real

- O cliente Socket.IO (`src/socket.ts`) conecta em `PUBLIC_API_URL`: o
  Socket.IO roda na própria API, e não há variável separada para o socket.
- O evento `catalogChanged` da API invalida as listas daquela entidade em
  todas as sessões abertas (`src/lib/catalog-sync.ts`).
- Torre de controle, monitoramento, rotas, chat e alertas de ocorrência
  também escutam o socket (`src/hooks/use-route-events.ts`,
  `use-operations-subscription.ts`, `use-presence-list.ts`). Uma rajada de
  eventos vira um refresh só, nunca dois em menos de 10 s
  (`src/features/control-tower/lib/refetch-scheduler.ts`).
- Desde a reunião de 14/10/2026, a Torre tem visões em `?view=` (Rotas, a
  padrão; Painel; Ocorrências; Atendimentos; Auditoria), que saíram das abas
  de Entregas. Os links antigos `?tab=monitoring|occurrences|chat|proof-audits`
  de Entregas redirecionam para a visão certa com os demais parâmetros. A
  torre relê a visão aberta a cada 1, 3 ou 5 min (escolha por navegador) e tem
  tela cheia para TV (`src/features/control-tower/shell`).
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
  `PUBLIC_API_URL`, `TURNSTILE_SITE_KEY`, `MAP_TILE_URL`,
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
- A renovação (`POST /user/refresh-token`) só acontece onde a sessão é usada:
  a área logada (páginas, navegações RSC e as Server Actions postadas nelas),
  as páginas de login e o relay. **Nunca** numa página pública nem num
  prefetch (`Next-Router-Prefetch`, `Sec-Purpose: prefetch`): um visitante com
  cookies velhos navegando no site custava uma renovação por página, e uma
  página cheia de links postava o mesmo refresh token várias vezes. O
  prefetch de uma página logada com o token vencido recebe `204`, e o router
  faz uma navegação completa no clique, que renova. A renovação espera no
  máximo 3 s; passou disso, é "API ocupada": a sessão fica e a tela de
  reconexão aparece, nunca um logout.
- `?force_logout=true` (revoga a sessão na API e apaga os cookies) só vale
  quando o navegador diz que a navegação é do próprio app
  (`Sec-Fetch-Site: same-origin` ou `none`). Um link em outro site não
  desloga ninguém; a página de login abre normalmente.
- O portão da área logada (`ProtectedProvider`) lê `/user/me` uma vez por
  requisição (`readSessionUser`, com o `cache()` do React, em
  `src/lib/session-access.ts`): o dashboard, o perfil e as abas de Entregas
  reaproveitam a mesma resposta. As 50 notificações do sino não seguram mais a
  página: a busca começa junto com `/user/me` e chega depois, num `Suspense`
  próprio (`streamed-notifications.tsx`).
- Toda leitura da API feita pelo servidor tem prazo: 10 s nas leituras de
  página e no `/user/me` (estourou, a tela de reconexão aparece, a sessão
  fica), 10 s nas leituras e 60 s nas escritas do `apiFetch`. Um prazo
  estourado no `apiFetch` vira uma resposta `504 API_TIMEOUT` com frase (na
  escrita, avisando que a operação pode ter sido concluída), nunca uma
  sentença sobre a sessão.
- Login, 2FA, recuperação de senha, refresh e rastreio público chamam a API a
  partir do servidor da web. Essas chamadas levam
  `RATE_LIMIT_FORWARDER_SECRET` (`src/lib/api-forwarding.ts`) para a API
  contar cada navegador pelo próprio endereço, e não todos pelo endereço do
  servidor da web. O valor precisa ser **o mesmo** da API.
- O Turnstile (Cloudflare) protege login, recuperação de senha e orçamento.
  Num servidor de produção, ele é obrigatório. Um único wrapper
  (`src/components/shared/custom/captcha-turnstile`) desenha o widget com
  estados explícitos (`captcha-machine.ts`): carregando (skeleton do tamanho
  do widget, atrás dele), pronto, verificado, expirado, erro, tempo esgotado
  (15 s sem token nem desafio) e script bloqueado. Erro e tempo esgotado
  oferecem "Tentar novamente", que desenha um widget novo. Script bloqueado
  oferece "Recarregar página": o `react-turnstile` 1.1.4 guarda a falha do
  `api.js` enquanto a página vive. O token fica no estado do formulário
  (`useCaptchaToken`) e num input oculto controlado. Ele só existe enquanto o
  widget que o emitiu está montado e válido. O formulário descarta o token
  quando a resposta do servidor mostra que ele já foi verificado
  (`token-consumed.ts`: qualquer resposta que não seja só erro de campo). O
  tema do widget segue o do app e fica congelado enquanto há token, para não
  pedir outro desafio.
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
- **Origens liberadas:** a API (`PUBLIC_API_URL`) e o `ws(s)://` da mesma
  origem para o socket, o storage das URLs pré-assinadas
  (`CSP_STORAGE_ORIGINS`, por padrão `https://*.r2.cloudflarestorage.com`), os
  hosts dos tiles (lidos de `MAP_TILE_URL` e `MAP_TILE_URL_DARK`), o Turnstile
  (`https://challenges.cloudflare.com`), `nominatim.openstreetmap.org` e
  `viacep.com.br`.
- **Trusted Types, passo 1 (só observação):** o middleware envia também
  `Content-Security-Policy-Report-Only: require-trusted-types-for 'script';
trusted-types nextjs nextjs#bundler default` (as políticas que o próprio
  Next cria). Não bloqueia nada e vale também nas páginas pré-renderizadas
  (não precisa de nonce). As linhas no log trazem `disposition: "report"`;
  servem para saber o que quebraria antes de exigir.
- **`report-uri /api/csp-report`** e **`report-to csp-endpoint`** (com o
  cabeçalho `Reporting-Endpoints`), nas duas políticas: cada violação vira
  **uma** linha `console.error` no log do contêiner. A rota corta query strings e segmentos
  opacos do caminho (as páginas públicas levam o token no caminho), limita o
  corpo a 16 KB e registra no máximo 60 linhas por minuto por instância. Uma
  linha ali é um ataque bloqueado ou uma página que a política quebrou. Leia
  sempre depois de um deploy.

## Next.js 14: versão e avisos de segurança

Decisão de 28/10/2026. Revisão obrigatória até **31/12/2026**, a mesma data
das exceções do `audit-ci.jsonc`.

**A decisão.** A web continua no Next.js **14.2.35** nesta rodada, como o
dono pediu. A linha 14 está como _Unsupported_ na
[política de suporte](https://nextjs.org/support-policy). A 14.2.35
(dezembro de 2025) é a última versão da linha. Ela fecha o desvio do
middleware (CVE-2025-29927) e o DoS de RSC de dezembro de 2025
(CVE-2025-55184, completado pelo CVE-2025-67779). Nenhum aviso publicado
depois disso tem correção em 14.x.

Ficar é defensável por dois motivos:

- nenhum dos três avisos críticos alcança esta implantação (tabela abaixo);
- a migração para 15 ou 16 é uma troca de major (React 19, APIs de requisição
  assíncronas, novos padrões de cache) e precisa de uma rodada de regressão
  própria.

A decisão não é permanente: o plano de saída tem data.

`yarn audit --groups dependencies` em 28/10/2026: 3 críticos (os três
abaixo), 25 altos, 16 moderados e 2 baixos. O `audit-ci` falha em qualquer
crítico novo.

**Os três críticos (RCE).** Estão como exceção no `audit-ci.jsonc` pelos
motivos abaixo:

| Aviso                                      | Condição para explorar                                        | Por que não alcança esta web                                                                                                                                                                                                                                                                                                  | Teste que trava a condição (`next-security-floor.test.ts`) |
| ------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GHSA-p293-qw3h-jr36 (corrigido na 15.5.24) | servidor rodando em Windows                                   | a imagem roda em Linux Alpine                                                                                                                                                                                                                                                                                                 | "runs on Linux Alpine (musl)"                              |
| GHSA-2xp9-vwfh-vxw4 (corrigido na 15.5.24) | o otimizador (`/_next/image`) decodificar um AVIF do atacante | não há `remotePatterns` em produção. Uma URL local é buscada pelo próprio servidor **sem cookies**, então o relay responde 401. Nenhuma rota da web devolve bytes enviados por alguém. As fotos enviadas (R2) são `unoptimized`. Na prática, o otimizador só decodifica as imagens estáticas do build (`/_next/static/media`) | "no external host in production"                           |
| GHSA-2464-fhr4-w9xw (corrigido na 15.5.28) | SVG decodificado pelo sharp em Linux com glibc                | `dangerouslyAllowSVG` está desligado, então o SVG é recusado antes do sharp. O sharp é o 0.35.5, o paliativo do próprio aviso. O Alpine usa musl, não glibc                                                                                                                                                                   | "refuses SVG…", "decodes with sharp 0.35.5…", "Alpine"     |

**Riscos residuais.** São avisos altos, sem correção em 14.x e sem paliativo
no Next:

| Aviso               | Corrigido em      | Efeito                                                       | Alcance aqui                                                                                                                                                                                                                                          |
| ------------------- | ----------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-m99w-x7hq-7vfj | 15.5.21 e 16.2.11 | DoS por CPU no processamento de Server Actions               | sim. Há 160 arquivos `"use server"`, e o id de uma action aparece no JS público (o login, por exemplo). O middleware confere só a presença e as claims do `tkey`, sem a assinatura, então não segura a requisição antes de o Next decodificar o corpo |
| GHSA-p3m5-59mp-jv5r | 15.5.28 e 16.4.1  | DoS por alocação sem limite em Server Actions (CPU)          | sim, pelo mesmo caminho                                                                                                                                                                                                                               |
| GHSA-q4gf-8mx6-v5v3 | 15.5.15 e 16.2.3  | DoS na desserialização de RSC (endpoints de Server Function) | sim                                                                                                                                                                                                                                                   |
| GHSA-8h8q-6873-q5fj | 15.5.16 e 16.2.5  | o mesmo                                                      | sim                                                                                                                                                                                                                                                   |
| GHSA-h25m-26qc-wcjf | 15.0.8, 15.5.10…  | o mesmo (CPU, falta de memória ou queda do processo)         | sim                                                                                                                                                                                                                                                   |
| GHSA-c4j6-fc7j-m34r | 15.5.16 e 16.2.5  | SSRF por pedido de upgrade para WebSocket no servidor Node   | possível. A web não usa WebSocket em produção (o Socket.IO conecta no host da API), mas o servidor do Next aceita o pedido                                                                                                                            |

Os outros altos do `next` não se aplicam:

- **GHSA-p9j2-gv94-2wf4** precisa de `rewrites`, e a web não tem nenhum
  (teste "has no rewrites").
- **GHSA-89xv-2m56-2m9x** precisa de servidor customizado. O `server.js` do
  `standalone` é o do próprio Next.
- **GHSA-36qx-fr4f-26g5** precisa de Pages Router com i18n. A web usa só o
  App Router.

Entre os moderados:

- **GHSA-ffhc-5mcf-pf4q** (XSS com nonce de CSP): o paliativo do aviso está
  aplicado. O `middleware.ts` substitui o `content-security-policy` que chega
  na requisição.
- **GHSA-wfc6-r584-vfw7, GHSA-3g8h-86w9-wvmq e GHSA-vfv6-92ff-j949**
  (envenenamento de cache): só funcionam com um cache compartilhado guardando
  HTML ou respostas RSC. As páginas dinâmicas saem com `no-store`, e a
  Cloudflare não guarda HTML por padrão. **Não crie regra de cache para
  HTML** enquanto a web estiver na 14.

**Controles compensatórios.** São recomendações e **não foram aplicados**:
ficam na configuração da Cloudflare e do Traefik, fora deste repositório.

1. **Rate limiting de Server Actions na Cloudflare:** uma regra só para o
   host da web, que conta por IP os `POST` com o cabeçalho `Next-Action`.
   - Expressão:
     `http.request.method eq "POST" and len(http.request.headers["next-action"]) > 0`.
   - Comece só registrando e calibre pelo tráfego real antes de bloquear. Uma
     pessoa dispara poucas actions por minuto, mas um escritório inteiro pode
     sair pelo mesmo IP.
   - O filtro por cabeçalho depende do plano. Sem ele, limite os caminhos
     públicos com formulário: `/login`, `/forgot` e `/orcamento`.
2. **Bloqueio de WebSocket no host da web**, para o GHSA-c4j6: uma regra de
   WAF com `http.request.headers["upgrade"][0] eq "websocket"` → Block, **só
   no host da web**. O host da API precisa do WebSocket para o Socket.IO.
3. **Origem fechada para a Cloudflare:** o Traefik do Dokploy deve aceitar só
   os IPs da Cloudflare, ou usar um túnel. Sem isso, as duas regras acima são
   contornadas pelo IP da origem.
4. **O que já vale hoje:**
   - o healthcheck e o reinício do Swarm
     ([deploy.md §6.4](deploy.md#64-advanced-swarm-recursos-e-saúde)), que
     reiniciam um processo travado. Com 1 réplica, a web fica fora até o
     reinício; mais réplicas reduzem esse efeito, mas não o eliminam;
   - o corpo de Server Action limitado a 1 MB (padrão do Next 14);
   - o `audit-ci`, que barra qualquer crítico novo.

**Endurecimento pendente** (fora desta rodada, porque mexe no
`next.config.mjs`): `images.localPatterns` com só `/_next/static/media/**`.
Isso transforma em regra o que hoje é só convenção: apenas as imagens
estáticas do build passam pelo otimizador. Valide `/sobre` e `/orcamento`, que
usam as fotos da equipe pelo `/_next/image`.

**Plano de saída.**

- **Alvo: Next 16.x** (Active LTS). A 15.x só recebe correções de segurança
  até 31/01/2027. Subir para a 15.5.28+ agora compraria três meses e pediria
  outra migração logo em seguida. A 15.5.28+ fica como plano B, caso algo
  bloqueie a 16. As duas exigem React 19 no App Router.
- **Até 13/11/2026:** abrir a branch de migração com
  `npx @next/codemod@latest upgrade`, que cuida do React 19 e de `cookies()`,
  `headers()` e `params` assíncronos. Revisar à mão:
  - `experimental.instrumentationHook`, `staleTimes` e
    `outputFileTracing*` no `next.config.mjs`;
  - o `middleware.ts`, que a 16 renomeia para `proxy.ts`;
  - o react-query v3, cujo peer declara React até a 18;
  - o kbar e as fontes.
- **Até 04/12/2026:** suítes unitárias e de navegador verdes, build medido
  contra a tabela de "Desempenho" e deploy em staging.
- **Até 31/12/2026:** produção. Depois disso, saem as três exceções do
  `audit-ci.jsonc`, e esta seção vira histórico.
- Se a data escorregar, a revisão de 31/12/2026 decide entre duas saídas:
  prorrogar com justificativa escrita aqui, ou passar a migração à frente das
  outras tarefas.

**Outras dependências do cliente.** Em 28/10/2026, o `socket.io-parser` foi de
4.2.4 para **4.2.7**, a mesma versão da API e do mobile. A atualização fechou
os avisos GHSA-677m-j7p3-52f9 e GHSA-2m8v-j782-fhvr, de DoS por anexos
binários. O `socket.io-client` declara `~4.2.4`, então bastou renovar o
lockfile, sem `resolutions`. Os avisos do `ws` (pelo `engine.io-client`) não
alcançam o navegador, que usa o WebSocket nativo.

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
`paths` do OpenAPI da API de produção (`/docs/json`). Linhas de comentário
ficam de fora: um exemplo citado num comentário não é chamada (a primeira
promoção da web parou em três desses, em 29/10/2026). Ele não compara métodos
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
- **Aquecimento no boot:** `src/instrumentation.ts` dispara, sem esperar,
  `src/app/docs/_lib/warm-up.ts`, que aguarda o `/api/health` responder e
  visita cada página do portal uma vez pelo loopback. Isso compila os guias
  MDX e põe o OpenAPI no cache antes do primeiro leitor depois de um deploy.
  É uma visita de verdade, e não uma chamada direta, porque a instrumentação
  é empacotada à parte das rotas e não compartilharia os caches delas. Só em
  produção; uma falha vira uma linha `[docs-warm-up]` no log, nunca derruba o
  boot.
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

## Tabelas: filtros, requisições e modo local

### Por que a `main` antiga parecia instantânea

A `main` antiga (último commit 37f34e9, agosto de 2026) filtrava e ordenava
no navegador **só as 10 linhas da página carregada**
(`getFilteredRowModel`/`getSortedRowModel` com `manualPagination`). O clique
custava zero requisições, mas a resposta estava errada:

- "Inativo" mostrava os inativos entre aquelas 10, enquanto o paginador
  continuava dizendo "Página 1 de 4";
- as opções e as contagens dos filtros vinham da página, não da empresa;
- os cartões contavam a página (`vehicle.filter(...).length`);
- no `/admin`, as listas misturavam todas as empresas.

A decisão 8.8 corrigiu isso: ordenação e filtros moram na URL, o servidor
repassa para a API, e a API responde pela empresa inteira, com contagens
disjuntivas. O preço é uma ida ao servidor por clique. A busca sempre foi do
servidor, com 400 ms de espera para juntar as teclas.

### Quanto custa cada interação

Medido na stack local (API 3334, banco `load_test`), com a imagem de produção
do HEAD (antes) e o servidor de desenvolvimento (depois). Uma "RSC" é um
render do servidor pedido pelo navegador; "API" são as chamadas que o
servidor da web fez à API para responder, contadas no log da API pelo
usuário da medição. O roteiro Playwright da medição ficou com o relatório da
rodada; no repositório, `tests/ui/table-filter-requests.spec.ts` trava o
essencial: zero requisições num filtro local e uma navegação num filtro de
lista grande.

| Tela                                 | Interação                    | Antes         | Depois        |
| ------------------------------------ | ---------------------------- | ------------- | ------------- |
| Tipos de ocorrência (`/dashboard`)   | marcar, limpar, próxima pág. | 1 RSC + 2 API | 0             |
| Tipos de ocorrência                  | busca                        | 1 RSC + 2 API | 1 RSC + 2 API |
| Filiais                              | marcar, limpar, próxima pág. | 1 RSC + 1 API | 0             |
| Filiais                              | busca                        | 1 RSC + 1 API | 1 RSC + 1 API |
| Veículos (lista grande, no servidor) | qualquer uma                 | 1 RSC + 1 API | 1 RSC + 1 API |

As 2 chamadas de Tipos de ocorrência são a sessão (`/user/me`) e a lista, uma
depois da outra (DLV-RO-2). Nas abas de Entregas com a chave
`delivery_manage` a sessão sai junto com a lista; no `/admin` entra também a
consulta de recusa da empresa (3 chamadas em paralelo).

O orçamento por página que vale daqui para a frente:

- **Lista no servidor** (padrão): 1 render e 1 leitura da lista por
  interação, mais a sessão quando a aba depende de outra permissão. A busca e
  a marcação de filtros esperam 400 ms para juntar cliques e teclas; fechar o
  popover ou "Resetar" envia na hora. Ordenar e paginar saem na hora.
- **Lista completa no navegador** (modo local, abaixo): marcar ou limpar um
  filtro, paginar, mudar o tamanho da página e ordenar por data custam
  **zero** requisições. Busca, ordenação por texto, outra empresa, outra aba
  e "Atualizar" continuam indo ao servidor.
- O paginador passa pela mesma fila (`ListQuery`) dos filtros: a tabela fica
  "ocupada" enquanto a página chega, os botões esperam, e um clique duplo não
  pede a mesma página duas vezes.
- A caixa de busca é controlada: Voltar e Avançar mostram o termo da URL.

### O modo local (lista completa)

Arquivos: `data-table/local-table.ts` (regras puras, usadas pelo servidor e
pelo navegador), `data-table/use-complete-list.ts` (o hook da tela),
`features/deliveries/lib/catalog-local.ts` e
`features/branch/lib/local-table.ts`.

**Onde vale:** Embarcadores, Tipos de ocorrência, Motivos de status e
Filiais. São catálogos pequenos, mantidos pela própria empresa, que não mudam
a todo instante. Importações, Entregas, Ocorrências, Rotas, Veículos,
Motoristas, Usuários (dados pessoais) e o resto continuam no servidor.

**A regra:**

1. O servidor faz **uma** leitura com página 1 e 100 linhas (o teto da API),
   com a busca, a ordenação e a empresa da URL, e **sem** filtro. Se o total
   cabe nessas linhas (`total <= linhas`), a lista é completa: o servidor
   manda todas as linhas e uma chave (`complete`). Senão, manda a página
   pedida, como sempre. Isso é decidido a cada render, nunca adivinhado a
   partir de uma página.
2. Com filtro na URL, o servidor primeiro faz a leitura que o modo servidor
   faria. Se as contagens dela provam que o conjunto sem filtro passa de 100
   (catálogo grande: todo clique), essa resposta vale e acabou, numa chamada.
   Senão, ele tenta a leitura completa (duas chamadas). Sem filtro e com a
   página dentro das 100 primeiras linhas, a leitura completa serve também
   para catálogo grande: o servidor corta a página dela (uma chamada).
3. No navegador, uma mudança só é respondida ali se a **chave** da URL nova
   for a mesma da leitura. A chave é tudo o que o navegador não varia
   sozinho: busca, empresa, aba, período e ordenação por texto. Ficam de fora
   os filtros, a página, o tamanho da página e a ordenação por data.
4. A URL continua sendo o estado. O navegador a muda com
   `history.pushState`, que o Next 14.2 transforma numa restauração do router
   sem nenhuma requisição (`app-router.js`). Recarregar, compartilhar o link
   ou voltar dá a mesma resposta pelo servidor.

**Paridade com a API** (a resposta local tem de ser igual à do servidor para
os mesmos parâmetros):

- Filtros: a mesma leitura de cada linha que a API usa no `GROUP BY`
  (`activeStatusOf`, `yesNoOf`, o valor da coluna), E entre filtros e OU
  dentro de um.
- Contagens e cartões: cópia dos `summarize*` da API, com a regra disjuntiva.
  Em Embarcadores e Motivos o único filtro é Status, e a API conta os cartões
  sem ele, então os cartões não mudam; só o total do paginador muda.
- Ordenação: só colunas que o Postgres e o navegador ordenam igual, sem
  collation: datas (`TIMESTAMP(3)`, milissegundos) e booleanos, seguidas do
  desempate da API (`created_at desc`, `id desc`, com ids UUID em minúsculas).
  Se alguma linha tiver um id ou uma data fora desse formato, toda a
  ordenação daquela leitura volta para o servidor. Nome, cidade e outros
  textos dependem da collation do banco (`en_US.utf8`): ficam no servidor.
- Busca: fica no servidor. A API decodifica o termo, compara com `ILIKE` no
  locale do banco, escapa curingas e cada endpoint tem os seus campos (os
  dígitos do CNPJ, o telefone, a regra do fim do ID). Não dá para provar
  paridade no navegador.
- Provas: `tests/unitaires/local-table-api-parity.test.ts` roda os
  `summarize*` e o `resolveOrderBy` da própria API (lidos do repositório
  irmão) contra a cópia da web, com catálogos aleatórios de semente fixa. Uma
  conferência ao vivo contra a API local comparou 672 combinações de filtros,
  ordenação e página, sem diferença.

**Empresa, sessão e frescor:**

- A tela é remontada por empresa (`key={businessId}`) e a empresa faz parte
  da chave. Nada fica fora do React, então o logout (carga completa) não
  deixa estado para trás.
- Criar, editar e excluir revalidam como antes, e o novo render traz a nova
  leitura completa.
- Depois de "Atualizar", até as linhas novas chegarem, toda mudança vai ao
  servidor: no Next 14.2 um `pushState` descarta o `router.refresh()`
  pendente. Os eventos de tempo real de Entregas (`useRouteEvents`) não
  avisam a tabela. Se um deles chegar no meio de um clique local, aquele
  refresh se perde. Os catálogos não mudam com eventos de rota, e o próximo
  evento ou o "Atualizar" traz o dado de volta.
- Uma mudança que pega carona numa busca ainda a caminho vai ao servidor
  junto com ela, nunca é respondida pelas linhas antigas.

**Custos:**

- Até 100 linhas de catálogo no payload do render, em vez de 10.
- Num catálogo pequeno com filtro na URL, um render do servidor (recarregar,
  "Atualizar", uma busca nova) faz duas leituras da lista: a do modo
  servidor e a completa. Os cliques seguintes não fazem nenhuma.
- Num catálogo acima de 100 com filtro na URL, é uma leitura, como antes,
  salvo quando as contagens não provam o tamanho (filtros que se cruzam).
- O `pushState` corrigido pelo Next precisa ser revisto em qualquer
  atualização do Next.

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
  o motor dos tutoriais no layout logado, a tabela de cada aba de Entregas
  (`features/deliveries/table`: um módulo por aba), os painéis das abas, os
  diálogos da barra de ações de Entregas (abertos no primeiro clique), cada
  visão da Torre (Painel, a fila de autorizações, a barra de Ocorrências e os
  painéis vindos de Entregas), as zonas de upload de foto (react-dropzone), o
  recorte de avatar do perfil, o detalhe da entrega e todo mapa Leaflet. As
  visões renderizadas no servidor continuam com SSR; o esqueleto de cada uma
  só aparece numa troca no navegador antes de o chunk chegar. A faixa de
  visões e a cadência da Torre leem só as chaves do react-query
  (`chat/lib/ticket-keys.ts`, `occurrence-authorizations/keys.ts`), sem o zod
  das regras. `tests/unitaires/client-bundle-boundaries.test.ts` lê o grafo
  de imports e falha se um import estático trouxer esse peso de volta.
- **Prefetch das abas:** no Next 14 (sem PPR), o prefetch automático de um
  link que só muda a query da página aberta (`?tab=`, `?view=`) renderiza a
  página inteira no servidor, com os dados: o corte no `loading.tsx` vale
  abaixo de um segmento, e esse render começa no próprio segmento da página.
  Abrir Entregas custava 24 chamadas à API (a lista de cada aba, duas vezes a
  de entregas). Por isso os links do `SegmentedNav` têm `prefetch={false}`, e
  o link do menu lateral para a página já aberta também; os outros itens do
  menu mantêm o prefetch automático, que para no `loading.tsx` deles e não lê
  nada. O servidor de Entregas e o da Torre leem só a aba ou visão aberta
  (`tests/unitaires/active-section-server-reads.test.ts`,
  `section-links-prefetch.test.ts`).
- **Torre aberta na última visão:** o menu lateral e o ⌘K levam
  `?view=<última>` (guardada no localStorage, `towerEntryHref`), então o
  servidor já renderiza a visão certa. Um link sem visão (aviso, favorito)
  ainda cai na visão padrão e o shell troca para a última no navegador.
- **Layout shift do captcha:** o widget do Turnstile monta meio segundo
  depois da página. O markup do servidor agora reserva a altura dele, e isso
  tirou o deslocamento de 0,10 medido no `/login`
  (`tests/unitaires/captcha-layout-shift.test.tsx`). O iframe do widget é
  inline e a linha somava 6 px sob ele (71 px numa caixa de 65), o que ainda
  movia o formulário; a caixa do widget tem `line-height: 0`. A caixa também
  reserva a largura mínima do widget (300 px), e o `(auth)/loading.tsx`
  reserva a mesma fatia na build de produção. Medido com a chave de teste:
  65 → 65 px em 1440, 390 e 320 px.
- **zod fora do bundle público:** `src/env/public-config.ts` não importa zod
  (só ele custava ~12,7 KB gzip em toda página).
- **Paleta ⌘K (kbar) fora da primeira carga:** o kbar é CommonJS e não
  passa por tree shaking. Um único `useKBar` (o botão "Procurar..." do
  cabeçalho e o painel vazio) trazia a busca (fuse.js) e a lista virtual
  (react-virtual) para toda página logada: o chunk tinha 18,3 KB gzip na build
  de 28/10/2026.
  - O layout carrega só a casca
    (`protected-command-bar-provider/index.tsx`, ~0,8 KB gzip estimado). Ela
    atende o ⌘K/Ctrl+K e os botões, que pedem a paleta pelo contexto dela
    (`useCommandPalette`).
  - A paleta (`palette.tsx`) é importada quando o navegador fica ocioso, ou
    no primeiro ⌘K ou clique, o que vier antes. Um pedido feito antes de o
    chunk chegar abre a paleta assim que ele chega.
  - Os atalhos de duas teclas ("e n", "r t"…) começam a valer com a paleta,
    depois da carga ociosa.
  - Os bytes ainda descem em toda carga completa da página, só que fora do
    caminho crítico da hidratação. Numa navegação entre páginas logadas, o
    layout continua montado e nada é baixado de novo.
  - `client-bundle-boundaries.test.ts` falha se um import estático trouxer o
    kbar de volta, e `command-palette-lazy.test.tsx` cobre o comportamento.
- **Treemaps:** `ANALYZE=true yarn build` grava os relatórios do
  `@next/bundle-analyzer` em `<distDir>/analyze/`, sem abrir o navegador.
  `NEXT_DIST_DIR` permite uma build de produção ao lado do `next dev` sem um
  sobrescrever o outro. Essa medição é feita pelo dono, porque builds não
  rodam nas sessões de agente.
- **Fontes:** o layout raiz pré-carrega Inter e Inter Tight (o `<h1>` da
  landing e o logo, o maior texto acima da dobra). A JetBrains Mono, que só
  aparece em rótulos pequenos, tem `preload: false`: os preloads do layout
  raiz saem em toda página, inclusive no app logado
  (`tests/unitaires/font-preload.test.ts`).
- Imagens: `images.formats` com AVIF e WebP. O otimizador usa o `sharp`
  (variante musl na imagem Alpine).

## A imagem Docker

`Dockerfile` em cinco estágios:

1. **node:** a imagem oficial `node:22.21.1-alpine3.23`, fixada por digest.
   Ela compila a aplicação e empresta o binário do `node` ao runtime.
2. **node-binary:** copia o binário com `cp -p` para `/out/usr/local/bin` e
   dá a `usr/`, `usr/local/` e `usr/local/bin/` o mtime do próprio binário.
   Copiado direto, o `COPY` gravava esses diretórios com a hora do build, e
   cada build sem cache (runner novo, cache do GitHub expirado) gerava um
   blob novo de ~46 MB do mesmo binário. Assim, a camada depende só do
   digest da imagem Node. A API tem o mesmo estágio, com o mesmo texto e os
   mesmos digests, e as duas imagens usam **o mesmo blob**: a VPS guarda e
   baixa o `node` uma vez só (medido em 28/10/2026: blob `7c5bc1becf2b`,
   46,1 MB comprimidos, igual na API e em dois builds sem cache da web; o
   total distinto das duas imagens caiu de 154,8 para 108,7 MB). Ao subir a
   versão do Node, suba nos dois repositórios.
3. **base:** `alpine:3.23.7`, fixada por digest, com só o binário do `node`
   do estágio anterior (`COPY --link`, a primeira camada depois do Alpine),
   mais `libstdc++`, `ca-certificates` e `dumb-init`. Não tem npm, yarn nem
   corepack. A minor do Alpine das duas imagens precisa ser a mesma
   (`tests/unitaires/image-layers.test.ts`).
4. **builder:** sobre o estágio `node`, `yarn install --frozen-lockfile` com
   cache, depois `yarn build`. Os únicos build args são `METADATA_BASE` (a
   origem de **produção**, impressa nos canonicals das páginas
   pré-renderizadas; staging nunca é indexado) e `GIT_SHA`. O par glibc do `sharp` (~17 MB) é removido
   antes da cópia. **Se a base voltar a Debian, tire esse passo**, ou o
   otimizador de imagens quebra.
   Os `node_modules` da saída `standalone` saem dela para virar uma camada
   própria do runner, copiada primeiro: um commit sem mudança de dependência
   não muda essa camada, e o servidor não a baixa de novo.
5. **runner:** sobre a `base`, usuário `nextjs` (uid 1001), `PORT=3000`,
   `HOSTNAME=0.0.0.0`, `NEXT_TELEMETRY_DISABLED=1`, saída `standalone` (`node server.js` sob
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
