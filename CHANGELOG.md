## [1.1.3](https://github.com/Trajetto-Organization/trajetto-ui/compare/v1.1.2...v1.1.3) (2026-10-30)


### Bug Fixes

* **web:** as fontes ficam no repositório e o build deixa de depender do Google ([cd50097](https://github.com/Trajetto-Organization/trajetto-ui/commit/cd5009764ab13566e26df905fd6fbef8d429ebaf))
* **web:** o captcha só carrega quando a pessoa usa a página ([4b63579](https://github.com/Trajetto-Organization/trajetto-ui/commit/4b635796e04a748f85c2e9573e406324bd254318))

## [1.1.2](https://github.com/Trajetto-Organization/trajetto-ui/compare/v1.1.1...v1.1.2) (2026-10-30)


### Bug Fixes

* **web:** /login e /forgot entram no sitemap ([230b78c](https://github.com/Trajetto-Organization/trajetto-ui/commit/230b78c62f462ef0a4ee80c96af99648c61cd800))
* **web:** o link "Voltar ao início" se chama pelo que mostra ([e08e0c0](https://github.com/Trajetto-Organization/trajetto-ui/commit/e08e0c008a30400fdba20b4a7690c0a2ab95abe3))
* **web:** o painel de notificações do /login vira decorativo (inert) ([31f57a6](https://github.com/Trajetto-Organization/trajetto-ui/commit/31f57a6e9caeaf32fd62618c8e55936c48cbc3fc))
* **web:** o sitemap lê os guias sem carregar o compilador de MDX ([9ccb9b2](https://github.com/Trajetto-Organization/trajetto-ui/commit/9ccb9b200b5a1222970a647beb2efa7455dc00ef))
* **web:** os guias da documentação da API entram no sitemap ([e71374a](https://github.com/Trajetto-Organization/trajetto-ui/commit/e71374a6584ab896cfdbafeb7296374b08cab249))

## [1.1.1](https://github.com/Trajetto-Organization/trajetto-ui/compare/v1.1.0...v1.1.1) (2026-10-30)


### Bug Fixes

* **web:** /login e /forgot passam a ser indexáveis ([af53af4](https://github.com/Trajetto-Organization/trajetto-ui/commit/af53af47763ac1530105df3108597d1f802a75f6))
* **web:** a busca de CEP desiste sozinha e devolve os campos quando o ViaCEP não responde ([8fe4ca4](https://github.com/Trajetto-Organization/trajetto-ui/commit/8fe4ca4863b60b5050ffcee4b58656c31ecfa4b8))
* **web:** o Reveal não pisca mais na hidratação e mede tudo antes de escrever ([406043b](https://github.com/Trajetto-Organization/trajetto-ui/commit/406043b2de2b8d1859deb1734d7d41ad72c349db))
* **web:** o título "Notificações" do painel do login passa no contraste ([dcbddcc](https://github.com/Trajetto-Organization/trajetto-ui/commit/dcbddccab13b6fbc428d0854502668d8c39ed871))
* **web:** política default de Trusted Types só para o loader do Turnstile ([b2f2c4a](https://github.com/Trajetto-Organization/trajetto-ui/commit/b2f2c4a746ba1ae891c401ba8dcedb76efc4ad87))


### Performance Improvements

* **web:** o CSS que só o app logado usa sai do globals.css ([18c9079](https://github.com/Trajetto-Organization/trajetto-ui/commit/18c907957f66d75d5162fad05075deb98a59058c))

# [1.1.0](https://github.com/Trajetto-Organization/trajetto-ui/compare/v1.0.4...v1.1.0) (2026-10-29)


### Bug Fixes

* **a11y:** o erro de formulário deixou de comer o rótulo do campo ([5c1676c](https://github.com/Trajetto-Organization/trajetto-ui/commit/5c1676c8f8a6703d0df8aa68ea5f119afba7d569))
* **acessibilidade:** armadilha de foco no tutorial, e remove um Escape duplicado ([710c156](https://github.com/Trajetto-Organization/trajetto-ui/commit/710c1562694f41511faf2f9ce8f9827fc7ac41e4))
* **acessibilidade:** auditoria WCAG das seis telas e as 24 violações ([15ce80b](https://github.com/Trajetto-Organization/trajetto-ui/commit/15ce80b41c1f16686576cdcac7b999374808c953))
* **deploy:** deploy da web pela API do Dokploy, igual à API ([e59de67](https://github.com/Trajetto-Organization/trajetto-ui/commit/e59de671cfd4f28f04f4dcc4b552a878ea1bcebb))
* **formatação:** a máscara arrastava pontuação que ninguém digitou ([766f92e](https://github.com/Trajetto-Organization/trajetto-ui/commit/766f92eb255d749587f0311d30eef7d2247a4a45))
* **integrações:** a confirmação virou diálogo do produto, e route.* seleciona mesmo ([3a861d2](https://github.com/Trajetto-Organization/trajetto-ui/commit/3a861d267057e0cb91aee83bb51dd33441a38b0b))
* logout esvazia o cache do react-query e o resto da sessao na aba ([922fb0e](https://github.com/Trajetto-Organization/trajetto-ui/commit/922fb0e396421816d0ff5d952da6f323d48fe30f))
* **responsividade:** conteúdo cortado e inalcançável em tablet e notebook ([7e0b5a9](https://github.com/Trajetto-Organization/trajetto-ui/commit/7e0b5a9dd73c67f118c2b180b5aeb0e264e13337))
* socket do painel passa a reconectar com credencial fresca ([4dc07b6](https://github.com/Trajetto-Organization/trajetto-ui/commit/4dc07b6a6f2ce3d932b4eef46ae3d9e2e58e0219))
* **ui:** duas composições para as seções, em vez de uma que se estica ([e36f9c7](https://github.com/Trajetto-Organization/trajetto-ui/commit/e36f9c78b1e23aac6a519adaa57b9157541b5752))
* **ui:** o limite de atualizar valia onde era barato e faltava onde era caro ([40d304a](https://github.com/Trajetto-Organization/trajetto-ui/commit/40d304a61794f34649d23397b1e6ce5a0f8b4683))
* **ui:** o motorista não pode ser convidado para o escritório ([c14330e](https://github.com/Trajetto-Organization/trajetto-ui/commit/c14330eb439bb0ded76c1435a9783a4c23bb131f))
* **ui:** redesenha o painel de paradas e impede que um clique fora apague o que foi digitado ([0ed9d61](https://github.com/Trajetto-Organization/trajetto-ui/commit/0ed9d61e277ed4f8bc0127f2021891cfcf404d6c))
* **ui:** torna o menu de ações um só controle e devolve a identidade à tabela de Rotas ([dd2fb29](https://github.com/Trajetto-Organization/trajetto-ui/commit/dd2fb29c38a9ef5ee71190b4e93f1c9c37176e5d))
* **ui:** uma área de soltar arquivo só, e o painel para de fechar sozinho ([6ad01df](https://github.com/Trajetto-Organization/trajetto-ui/commit/6ad01dfce26ab958ff2b4fc04f53f59fd20d5383))
* **veiculo:** "Em rota" sai do formulario -- e a rota que escreve ([5da4eca](https://github.com/Trajetto-Organization/trajetto-ui/commit/5da4eca3c395f742c84b75d425dc6304f6545e90))
* **web:** a busca de Entregas parte de 200px e o período fica na linha dos filtros ([ea99129](https://github.com/Trajetto-Organization/trajetto-ui/commit/ea99129a9c07ad482b2cb822905408b443061b00))
* **web:** a fronteira Server/Client, e por que só o /admin caía ([4f4f090](https://github.com/Trajetto-Organization/trajetto-ui/commit/4f4f0908b902cea5c4c9090917bbdda4aace9067))
* **web:** a imagem passa no scanner de vulnerabilidades ([23c4fcf](https://github.com/Trajetto-Organization/trajetto-ui/commit/23c4fcfc79dbe121d22f2791d4fb9d47111de009))
* **web:** build da imagem verde e deploy só como Application ([ae65d0c](https://github.com/Trajetto-Organization/trajetto-ui/commit/ae65d0c5afb2061e5dd16351127aa3ff25f3461d))
* **web:** no empate de milissegundo, Limites de uso fica com a resposta do servidor ([59704a0](https://github.com/Trajetto-Organization/trajetto-ui/commit/59704a005c5f19d96594db4d1507edb965bfda9f))
* **web:** o Cloudflare Web Analytics carrega também nas páginas pré-renderizadas ([e9d4389](https://github.com/Trajetto-Organization/trajetto-ui/commit/e9d4389fb26afafa707bce91c3ce47f0c7728b1b))
* **web:** o formulário de webhook reportava erro só por toast ([874f300](https://github.com/Trajetto-Organization/trajetto-ui/commit/874f3001faf50cabcdb859ba0b3d52ec80ced775))
* **web:** o gate de rotas do promote ignora os exemplos citados em comentários ([b7480bd](https://github.com/Trajetto-Organization/trajetto-ui/commit/b7480bd1e48ed5075f4a94aea9def04e65a67528))
* **web:** páginas legais e posts do blog não caem com a sessão de outra pessoa ([b13bfea](https://github.com/Trajetto-Organization/trajetto-ui/commit/b13bfeab93e68803a1fd717e8215c26e86386748))
* **web:** Permissions-Policy sem o browsing-topics, que o Chrome não reconhece mais ([44a0b70](https://github.com/Trajetto-Organization/trajetto-ui/commit/44a0b70c8f94690f94c8313a68d438d322edca28))
* **web:** sharp 0.35.5 e suítes de navegador com o env completo da API ([347b3f2](https://github.com/Trajetto-Organization/trajetto-ui/commit/347b3f2ce9cd109d216a9ab2ccf0e7ae2381cf3c))


### Features

* **dashboard:** cards de entregas e o bloco "Operação de hoje" ([07e9bd2](https://github.com/Trajetto-Organization/trajetto-ui/commit/07e9bd2205bd518c087aa89a464206b05b3fc825))
* **dashboard:** entregas e rotas viram séries do gráfico de tendências ([7ab073a](https://github.com/Trajetto-Organization/trajetto-ui/commit/7ab073ac0f631e019058e038dcf1296ce74be688))
* **entregas:** designar agora cria e libera uma rota, e o veículo é obrigatório ([45c7324](https://github.com/Trajetto-Organization/trajetto-ui/commit/45c7324a5d19cc7b489c5b5f2347d21bffedaeb9))
* **fatia-10:** fila de auditoria de comprovantes no painel ([c959712](https://github.com/Trajetto-Organization/trajetto-ui/commit/c959712cbe0ae5b6d00d1b6ab712214ffd0ec435))
* **fatia-7:** tela de Rotas no painel ([56698d7](https://github.com/Trajetto-Organization/trajetto-ui/commit/56698d7fb3562f2301294f8417690b44cd9da0b1))
* **fatia-8:** motivo de status, historico, importacao por planilha e exportacao ([e2a2f14](https://github.com/Trajetto-Organization/trajetto-ui/commit/e2a2f149985c2cd505b88d8fd00cf714bd4aa6d4))
* **fatia-9:** comprovante no detalhe da entrega ([6b6dfc2](https://github.com/Trajetto-Organization/trajetto-ui/commit/6b6dfc2fbb73402b4c7306ba71409b5055a52c07))
* **fatia-9:** paginas publicas do comprovante e do acompanhamento ([0ea8be1](https://github.com/Trajetto-Organization/trajetto-ui/commit/0ea8be15bf5ba4516978bea8a72c96f1b5141c4f))
* **fatia-9:** tela onde a empresa escreve as mensagens ao cliente ([e29629b](https://github.com/Trajetto-Organization/trajetto-ui/commit/e29629b7365fd58c927433e62c577b9af64a985b))
* **integrations:** aba "Uso da API" ([ca56ad7](https://github.com/Trajetto-Organization/trajetto-ui/commit/ca56ad729f6eff45409fd6149affd473078bc75f))
* **integrations:** telas de chaves, webhooks e monitor de envios ([e45baeb](https://github.com/Trajetto-Organization/trajetto-ui/commit/e45baebef0d9ac5d3716cb9374f6422a71a2fe9d))
* telas de Entregas e Chat, features/ como pasta compartilhada e correcoes ([40c0247](https://github.com/Trajetto-Organization/trajetto-ui/commit/40c0247764a21729983b83545245df90e406e773))
* **tempo real:** o quadro de rotas e as telas de entrega seguem a operação ([a05fa91](https://github.com/Trajetto-Organization/trajetto-ui/commit/a05fa916edb84676afad60887718324ae20271c1))
* **torre:** assina a sala de operação, que agora tem verificação de permissão ([6371249](https://github.com/Trajetto-Organization/trajetto-ui/commit/63712498ff2a2f6526aeccf19bd88f1ada8d5261))
* **torre:** mapa da frota, trajeto do dia e os quatro widgets fixos ([4e84357](https://github.com/Trajetto-Organization/trajetto-ui/commit/4e843573276f56475d3e1840f6ed8c895a6716df))
* **ui:** um grupo de filtros e um estado vazio para o produto inteiro ([6fb324d](https://github.com/Trajetto-Organization/trajetto-ui/commit/6fb324ddb70551c81083317d9c8ac6d4caefe2f2))
* **web:** a hierarquia da área de Entregas, e o vazio que ela deixava ([cdd2662](https://github.com/Trajetto-Organization/trajetto-ui/commit/cdd2662bae21f4ec2d2cf966b04683d6026ef605))
* **web:** ajustes finais de 28/10 — datas, abas, IDs, Torre, Turnstile, filtros e imagem ([e5bad1c](https://github.com/Trajetto-Organization/trajetto-ui/commit/e5bad1c78663d60cbb5d88ee786cc2c9e2ebe9da))
* **web:** fase final de estabilização, redesign e esteira staging → produção ([0ee8418](https://github.com/Trajetto-Organization/trajetto-ui/commit/0ee841887143862bfe7e596244a6623e13dd1c2b))
* **web:** limites de erro, contraste medido, e o tema escuro passou a existir ([74536a3](https://github.com/Trajetto-Organization/trajetto-ui/commit/74536a3f03b8bddad20b9ad94777394137f96555))
* **web:** logo vetorial, sem borrão ao carregar, igual em todo o site ([72a607c](https://github.com/Trajetto-Organization/trajetto-ui/commit/72a607ce23c12b0fb389ed5c06978134f50cef1c))
* **web:** o Socket.IO usa sempre a URL da API ([6bda259](https://github.com/Trajetto-Organization/trajetto-ui/commit/6bda259e27fbc75765c9fe0b09631f736b95c7e7))
* **web:** os perfis sociais da marca entram no JSON-LD (sameAs) e nos cards do X ([a1c5242](https://github.com/Trajetto-Organization/trajetto-ui/commit/a1c5242680ee3c1f440fc730863346599ad01e0f))
* **web:** Rotas, Integrações e o modal que eram duas telas coladas ([0bd297c](https://github.com/Trajetto-Organization/trajetto-ui/commit/0bd297ce2cb986c5952d23988325d2d2d6b3ff3d))


### Performance Improvements

* **web:** leituras paralelas, uma ida por gravação, Entregas e Torre da reunião ([3c186d8](https://github.com/Trajetto-Organization/trajetto-ui/commit/3c186d81ed670e5c7e01ca71de04b1e8f9c7092a))

## [1.0.4](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/compare/v1.0.3...v1.0.4) (2026-08-12)


### Bug Fixes

* apply linting fixes ([d723b90](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/d723b908868ec708ad2be1a9235f6e9226521cae))

## [1.0.3](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/compare/v1.0.2...v1.0.3) (2026-08-12)


### Bug Fixes

* tira o CHANGELOG.md do lint ([800cca1](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/800cca1483a5177459e23ab7fae60db3fd2124b7))
* versiona o next-env.d.ts para o type-check do CI passar ([fa7abd1](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/fa7abd1853d3f2c17b7ef2914f95fbe2ecdb1383))

## [1.0.2](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/compare/v1.0.1...v1.0.2) (2026-08-11)


### Bug Fixes

* conecta o socket so por WebSocket, sem o fallback de long-polling ([1d553dc](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/1d553dc5c0f0e2df297dae2505ec8127970083f3))

## [1.0.1](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/compare/v1.0.0...v1.0.1) (2026-08-11)


### Performance Improvements

* migra a imagem do front-end para Alpine e enxuga o sharp ([ac5bcd3](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/ac5bcd3efdf299d142e761beb37087e293bdb428))
* remove generateBuildId aleatorio e a dependencia uuid ([a2f3de4](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/a2f3de4d205ea801c15640eed144f77fd2b6e2d1))

# 1.0.0 (2026-08-11)


### Bug Fixes

* `compose-production.yaml` hostname field ([f2f0572](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/f2f0572ac4aefca19e17586d468fa017e280a4ba))
* about team section and _components structure components ([3d40adf](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/3d40adf547d6063fa3a4f7c136964c75b85d49e3))
* api health check and compose.deploy ([ba2e0f6](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/ba2e0f6c16d7575827f3e7bfce271b48e6732f7f))
* blur real nas imagens, remove conteudo ficticio e reordena os modais ([c226a17](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/c226a17c680039392a3a8b0cfc280ce568709e65))
* compode.deploy ui image ([40d0612](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/40d06123d77b65bbe7e9c7aaa3cfd1fd42872cc3))
* compose.deploy ([863e6fe](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/863e6fef4af30b59b98ddc41459a39268f300f2c))
* compose.local.yaml fixes ([d3226da](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/d3226daabf9fa2c7896b62a75c1a5039e4879611))
* dashboard/admin update fuel form ([9e31d1f](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/9e31d1fddb91384f8b007058583f879403c85027))
* data table scroll ([b2a7d1c](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/b2a7d1c8be101cf13504793f80bd27d6e4ea80af))
* fix `create-update-vehicle-schema` ([ea85822](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/ea85822bb1b21bdea54ff81171bd8a572b15a503))
* fix fuel details and alert hierarchy folder ([fb9f80f](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/fb9f80ff2c56eebd9ae855b30caa24a7a9ea4560))
* fix landinpage copy and structures ([e429c40](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/e429c40e93046fc9cb6a95b7d0bda88a411812b8))
* fix two factor verification validation ([66ebadf](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/66ebadf6fbfa8f219cb3f4af403e1aab39015713))
* fotos do R2 deixam de passar pelo otimizador do Next ([1c23613](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/1c2361341d7e9047d0c8ed8985d1f9b678be58ad))
* ghcr actions ([90820c2](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/90820c296da74879b229cc376028e629a5186269))
* github workflow fixes ([a789939](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/a7899398022ca72e1c574758dcbb638365eb38cf))
* hero and AI limit copy ([0d57a87](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/0d57a879fcab930dafda74a7da5ebcf93e20fb09))
* home components ([ae24331](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/ae24331c715417b3bca827a24814f0153b563b2f))
* html for labels ([11f3cd0](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/11f3cd0fc661f6669bffdb4eedc23ecbea5dd740))
* kanban cards ([6ce1496](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/6ce1496cf1002cac0f23db09f3ca68a136e7a07b))
* part dto ([6a03ac6](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/6a03ac6aa443bd0812fe4d391f98bd256fe8aace))
* turnstile none zod validation error ([b37ebd2](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/b37ebd2c2350ab2f1c168a4980883a0f3638f778))
* turnstile validation ([4c3472e](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/4c3472e7e82c33a0db42ac2529f8aaaef06310fb))
* vehicle components ([459c72a](https://github.com/Trajetto-Organization/trajetto-fleet-manager-ui/commit/459c72afdef8859a8b1707eb7f8d9a4494b014c9))
