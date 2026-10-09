# Suítes de navegador (ui, responsive, a11y)

As três configurações abaixo abrem um Chromium de verdade contra a pilha
rodando nesta máquina. Nenhuma sobe a pilha sozinha: siga os passos na ordem.

| configuração                      | pasta              | workers | o que pergunta                                      |
| --------------------------------- | ------------------ | ------- | --------------------------------------------------- |
| `playwright.ui.config.ts`         | `tests/ui`         | 3       | a tela mostra o que a API mandou? os fluxos fecham? |
| `playwright.responsive.config.ts` | `tests/responsive` | 4       | cabe de 320 a 1920 px?                              |
| `playwright.a11y.config.ts`       | `tests/a11y`       | —       | o axe aceita? dá para operar?                       |

`playwright.config.ts` (a suíte `tests/E2E`) é outra coisa: regras puras, sem
navegador e sem pilha.

## 1. Banco e Redis descartáveis

Só os containers descartáveis — nunca o `trajetto-database` nem o
`trajetto-redis` do dia a dia.

```bash
docker start trajetto-itest-pg trajetto-test-redis

# A senha vem do próprio container; não a copie para arquivo nenhum.
PW=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' trajetto-itest-pg | sed -n 's/^POSTGRES_PASSWORD=//p')
export DATABASE_URL="postgresql://trajetto:${PW}@localhost:54321/load_test?schema=public"
export REDIS_URL="redis://localhost:63790" REDIS_HOST=localhost REDIS_PORT=63790

# Primeira vez: o banco load_test.
docker exec trajetto-itest-pg createdb -U trajetto load_test
```

## 2. Schema, seed e as contas com senha (no `trajetto-api`)

```bash
cd ../trajetto-api
npx prisma migrate deploy
LOAD_DRIVERS=40 npx tsx tests/load/seed.ts        # 40 empresas e os tokens das telas (load-context.json)
npx tsx tests/load/mint-master.ts                  # sessão do MASTER (browser-sessions.json)
npx tsx tests/load/mint-browser-users.ts           # contas com senha (browser-users.json)
```

`mint-browser-users.ts` cria MASTER, gestora, segunda gestora, funcionário com
perfil completo, funcionário só de leitura em Entregas, gestor com dois
fatores, motorista, uma empresa só com FROTA e outra só com ENTREGAS. Rodar de
novo aposenta as contas anteriores e cria outras (não apaga: há linhas que
apontam para elas). A senha das contas é `WEB_E2E_PASSWORD` (padrão
documentado: `Navegador@E2E2026`); os JSON em `tests/load/fixtures/` não a
guardam.

Os tokens do `load-context.json` vencem em cerca de 12 horas. O seed só roda
num `load_test` vazio (ele recusa um banco já semeado e diz isso): para tokens
novos das sessões basta rodar de novo `mint-master.ts` e
`mint-browser-users.ts`; para semear de novo, recrie o banco antes:

```bash
docker exec trajetto-itest-pg dropdb -U trajetto load_test
docker exec trajetto-itest-pg createdb -U trajetto load_test
npx prisma migrate deploy
```

## 3. API e web

```bash
# trajetto-api, com o DATABASE_URL e o REDIS_URL do passo 1. API_HTTP_REQUEST
# é o endereço público da própria API: vira o `servers` do documento público,
# e o /docs/console da web redireciona para ele.
NODE_ENV=test PORT=3334 API_HTTP_REQUEST=http://localhost:3334 npx tsx src/server.ts

# trajetto-ui — a configuração pública é lida em runtime (decisão 12.2)
PUBLIC_API_URL=http://localhost:3334 HTTP_REQUEST=http://localhost:3334 \
PUBLIC_SOCKET_URL=http://localhost:3334 METADATA_BASE=http://localhost:3100 \
TURNSTILE_SITE_KEY=1x00000000000000000000AA \
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA \
NODE_OPTIONS=--max-old-space-size=6144 NEXT_DEV_KEEP_PAGES=1 \
npx next dev -p 3100
```

`NEXT_DEV_KEEP_PAGES=1` (só no `next dev`; ver `next.config.mjs`) mantém
compiladas as rotas já abertas. Sem ele o `next dev` descarta uma rota parada
há 60 s e guarda só cinco: três workers passando por ~45 rotas faziam o
servidor recompilar no meio dos testes, e as esperas por estado
pós-hidratação estouravam por causa da compilação, não do produto.

As chaves do Turnstile acima são as chaves de teste públicas da Cloudflare
(sempre aprovam); nunca use as de produção aqui.

Numa corrida inteira da `ui` (25 min, três workers) o `next dev` passou do
limite de memória padrão e se reiniciou sozinho ("Server is approaching the
used memory threshold, restarting..."): as abas abertas levaram
`ERR_CONNECTION_RESET` e testes sem relação caíram juntos. Suba-o com
`NODE_OPTIONS=--max-old-space-size=6144` e, entre uma corrida inteira e outra,
reinicie-o.

## 4. Rodar

A configuração `ui` tem um `globalSetup` (`tests/ui/support/warm-up.ts`) que
abre, uma por vez, todas as rotas que a suíte visita antes de os workers
começarem (uns minutos no primeiro start do `next dev`). Ele existe porque o
primeiro teste contra um `next dev` frio recebia um chunk ainda em compilação
("SyntaxError: Invalid or unexpected token") e a página nunca hidratava.
`UI_SKIP_WARM_UP=1` pula o aquecimento numa corrida de um arquivo só.

O processo do Playwright precisa do mesmo `DATABASE_URL` do passo 1: o 2FA, a
troca de senha e as contas criadas no meio de uma jornada passam pelos
scripts `mint-*.ts` do `trajetto-api`, que escrevem direto no banco
descartável. Sem ele, `support/login.ts` para com a mensagem que diz isso.

```bash
npx playwright test -c playwright.ui.config.ts
npx playwright test -c playwright.responsive.config.ts
npx playwright test -c playwright.a11y.config.ts
```

Rode cada configuração com os workers dela (é como a noite roda), não só um
arquivo sozinho: as falhas que só aparecem com o servidor de dev compilando
outras rotas ao mesmo tempo são as que importam.

## 5. Desligar

Pare o `next dev` e a API. Os containers descartáveis podem ficar de pé ou ser
parados (`docker stop trajetto-itest-pg trajetto-test-redis`).
