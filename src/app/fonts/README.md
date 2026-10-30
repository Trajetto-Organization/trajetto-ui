# Fontes

As três fontes do site e do sistema, carregadas pelo `next/font/local` em
`src/app/layout.tsx` e servidas pelo próprio domínio. Ficam no repositório
para o build não depender da rede: com o `next/font/google`, o `next build`
baixava as fontes do Google a cada build, e um download que falhava derrubava
o build (aconteceu três vezes em 30/10/2026).

| Arquivo                      | Fonte                                       | Pesos declarados no layout |
| ---------------------------- | ------------------------------------------- | -------------------------- |
| `inter-latin.woff2`          | Inter, variável (eixo de peso de 100 a 900) | 400 a 700                  |
| `inter-tight-latin.woff2`    | Inter Tight, variável (100 a 900)           | 500 e 600                  |
| `jetbrains-mono-latin.woff2` | JetBrains Mono Medium, estática             | 500                        |

Os três são o subconjunto latino que o Google Fonts serve, o mesmo arquivo
que o `next/font/google` baixava e pré-carregava. O layout repete o
`unicode-range` desse subconjunto. Foram baixados em 30/10/2026 a partir das
mesmas consultas que o carregador do Google fazia:

```text
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&display=swap
https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap
```

Para atualizar uma fonte, abra a consulta com o user-agent de um navegador
atual (o Google só entrega `woff2` a ele), copie a URL do bloco `/* latin */`,
baixe o arquivo e troque o daqui, com o mesmo nome. Um peso novo no produto
entra no `weight` do layout; nas variáveis, ele já está no arquivo.

Licença: SIL Open Font License 1.1, nos arquivos `*-OFL.txt` ao lado.
