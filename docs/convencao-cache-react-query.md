# Convenção de cache — react-query v3

Documento curto de propósito. Ele existe por um motivo específico: o app tem
**113 `resetQueries` contra 15 `invalidateQueries`**, e a leitura natural disso
é "alguém usou a marreta onde cabia o alicate". Está errado. Esse número é
consequência de uma opção deliberada, e trocar reset por invalidate para
"melhorar" quebraria os seletores.

## Por que `resetQueries` domina aqui

Vinte e dois seletores de busca declaram `refetchOnMount: false` — é o que
impede um `<Select>` de disparar requisição toda vez que um formulário abre.

No react-query v3, `refetchOnMount: false` só é honrado **enquanto a query
ainda TEM dado**. A decisão de buscar ao montar passa por `shouldLoadOnMount`,
que devolve verdadeiro quando `dataUpdatedAt` é 0, independentemente da opção.

A consequência prática é a que motivou este documento: criar um embarcador e
depois abrir o formulário de entrega não mostrava o embarcador novo.
`invalidateQueries(["shipper"])` marcava a query como obsoleta, mas **o dado
continuava lá**, e com `refetchOnMount: false` o seletor a servia do jeito que
estava. `resetQueries(["shipper"])` derruba o dado, `dataUpdatedAt` volta a
zero, e o próximo mount é obrigado a buscar.

Verificado executando a build real do `react-query@3.39.3` em Node:
`fetches: 1 → 1, status: error` antes; `1 → 2, status: success` depois.

Também não adianta refetchar em segundo plano: um refetch inativo reaproveita
o closure do `queryFn` do último observer que buscou, e esse closure rejeita
assim que o componente desmonta (`if (!isMountedRef.current) return
Promise.reject(...)`).

## A regra

| Use | Quando |
|---|---|
| **`resetQueries`** | O alvo é um seletor de busca (qualquer coisa em `_components/shared/searches/**`) ou qualquer query com `refetchOnMount: false`. É a única forma que funciona com essas opções. Também quando o conjunto mudou de identidade, não só de conteúdo. |
| **`invalidateQueries`** | O alvo é uma query montada e visível, com as opções padrão. Marca como obsoleto e refetcha em segundo plano, mantendo o que está na tela — que é exatamente o que se quer numa tabela aberta. |
| **`setQueryData`** | Já se tem o valor novo e confiável, vindo da resposta da própria mutação. Evita a ida ao servidor. Só dois usos hoje; mais seriam bem-vindos, mas só onde a resposta traz o registro completo. |
| **`clear`** | A sessão acabou. Um lugar só: `lib/clear-session-state.ts`. |
| **`removeQueries`** | Praticamente nunca. `resetQueries` cobre o caso e mantém as opções da query. |

## Forma das chamadas

As 113 chamadas usam a forma de array — `resetQueries(["shipper"])` — e duas
usam `resetQueries({ queryKey: [...] })`. **As duas são equivalentes**; a de
array não é mais rápida, ao contrário do que a proporção sugere. Padronizar é
questão de legibilidade e vale como varredura mecânica própria, nunca
misturada com correção de bug.

## Chaves

Toda chave carrega o escopo de que o `queryFn` depende. Auditei as 27 chaves do
app: **todas são consistentes com seus `queryFn`**. As três que parecem sem
escopo não são bug:

- `["business"]` e `["traffic_violation_code"]` — dado que não pertence a
  transportadora nenhuma (a lista de empresas é MASTER; a tabela de infrações é
  do DETRAN).
- `["account-payables-by-responsible-user"]` — o `businessId` não entra na
  chave porque também não entra na requisição: o backend o deriva do token.

O que **não** existe em chave nenhuma é o id do usuário. Isso não é descuido —
é o motivo de `clear()` no logout ser obrigatório, e está explicado em
`lib/clear-session-state.ts`. Não tente consertar acrescentando `userId` às
chaves: seriam 27 lugares para errar, e a limpeza no logout resolve a classe
inteira em um.

## Ao adicionar uma query nova

1. A chave contém tudo que o `queryFn` lê. Se o `queryFn` lê `search`, a chave
   carrega `search`.
2. Se declarar `refetchOnMount: false`, quem invalida esse dado tem que usar
   `resetQueries`. Escreva isso no lugar onde a mutação acontece, não aqui.
3. Dado sensível não precisa de tratamento especial na chave — precisa que
   `clearSessionState` continue sendo chamado no logout, o que tem teste.
