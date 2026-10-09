import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import {
  exportStep,
  filtersStep,
  revalidateStep,
  rowActionsStep,
  searchStep,
  statsStep,
  tableStep,
  viewOptionsStep,
  welcomeStep,
} from "./factories";

/**
 * Tours of Entregas: one per tab (DELIVERY_TABS), each with its own "seen"
 * flag. Key "/dashboard/deliveries" is the Entregas tab; the others are
 * "/dashboard/deliveries/<tab>" (see engine/tutorial-key).
 */

const tabsStep = (): TutorialStep => ({
  anchor: "deliveries-tabs",
  title: "Seções de Entregas 📑",
  content: `O módulo tem dez seções, cada uma com a sua tabela ou painel:
  • Entregas, Ocorrências, Monitoramento e Atendimentos: o dia a dia da operação
  • Embarcadores, Tipos de Ocorrência e Motivos de Status: os cadastros
  • Importações, Mensagens ao Cliente e Auditoria de Comprovantes: o que entra, o que sai e o que foi comprovado
  NOTA: Você só vê as seções que o seu perfil pode ler. Cada seção tem o próprio tutorial, que abre na primeira visita.
  DICA: A seção fica na URL, então um link compartilhado reabre a mesma tela.`,
  placement: "bottom",
});

const deliveriesTab: TutorialStep[] = [
  welcomeStep(
    "Módulo de Entregas 📦",
    `A central de distribuição: aqui você cadastra as entregas, coloca cada uma numa rota e acompanha até a porta do destinatário.
    Uma entrega nasce de três formas: cadastrada à mão, importada do XML da NF-e ou de uma planilha.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    IMPORTANTE: O módulo Entregas precisa estar contratado pela empresa; sem ele a página não abre para ninguém.`,
  ),
  tabsStep(),
  statsStep(),
  exportStep("Entregas", "Gerenciar Entregas", [
    "Destinatário, endereço e embarcador",
    "Status, rota e motorista",
    "Data prevista e chave da NF-e",
  ]),
  revalidateStep(
    "Atualizar",
    "Útil aqui: motoristas e outros operadores mudam status o dia inteiro.",
  ),
  {
    anchor: "import-xml-button",
    title: "Importar 📄",
    content: `O menu Importar tem duas portas para a mesma sala:
    • Planilha (.xlsx ou .csv): muitas entregas de uma vez, com relatório linha a linha
    • XML da NF-e: destinatário, endereço, número e chave da nota e itens lidos do arquivo
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: A chave da NF-e impede duplicidade; a mesma nota importada duas vezes é recusada. Toda importação aparece na seção Importações e pode ser estornada.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "create-button",
    title: "Nova Entrega 🆕",
    content: `Cadastra uma entrega sem arquivo.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    Obrigatórios: Embarcador, Destinatário e endereço (o CEP preenche cidade, bairro e rua).
    Opcionais: telefone e e-mail do destinatário, código do pedido, chave da NF-e, data prevista, itens e observações.
    NOTA: A chave da NF-e é definida uma vez: editável enquanto vazia, fixa depois.`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Entregas 🔍",
    `Encontre uma entrega pelo ID, destinatário, pedido, NF-e, cidade, motorista ou CNH.
    DICA: A busca percorre todas as entregas da empresa, não só a página carregada.`,
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    `Os filtros respondem às perguntas do dia:
    • Status: pendente, em rota, entregue, insucesso ou cancelada
    • Embarcador: a carga de um remetente
    • Motorista: a carga de um condutor`,
  ),
  tableStep(
    "Tabela de Entregas 📋",
    `Cada linha traz destinatário, embarcador, destino, status, rota e data prevista (só a data, sem horário).
    O status segue um caminho definido:
    • Pendente → Em rota (só com rota iniciada pelo motorista) ou Cancelada
    • Em rota → Entregue, Insucesso, de volta a Pendente, ou Cancelada
    • Insucesso → Pendente (nova tentativa) ou Cancelada
    IMPORTANTE: Mudança manual de status exige um motivo, e marcar Entregue pelo painel exige informar quem recebeu.`,
  ),
  {
    anchor: "deliveries-select-all",
    title: "Adicionar à Rota 🚚",
    content: `Marque as entregas e a barra flutuante oferece Adicionar à rota.
    Escolha uma rota em planejamento ou liberada, ou planeje uma nova. Entregas que já estão em outra rota que ainda não saiu são movidas.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: A rota é a unidade de atribuição: motorista e veículo pertencem à rota, e ela só chega ao motorista quando você a libera na página dela.`,
    placement: "right",
    optional: true,
  },
  rowActionsStep(
    "Ações da Entrega ⚙️",
    `O menu de três pontos (⋮) de cada entrega tem:
    • Ver detalhes: histórico, itens, ocorrências, comprovante e mensagens da entrega
    • Editar entrega e Copiar ID
    • Cancelar entrega: o fim do ciclo (entregas não são excluídas, para preservar a trilha de auditoria)
    NOTA: Ações que o seu perfil não pode usar aparecem desabilitadas, com o motivo ao passar o mouse.`,
  ),
  viewOptionsStep(),
];

const occurrencesTab: TutorialStep[] = [
  welcomeStep(
    "Ocorrências 📋",
    `Tudo o que o motorista registrou nas entregas, numa tabela só: entregas normais, não entregas e pausas, com fotos, local e respostas do formulário do tipo.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Ocorrências`,
  ),
  tabsStep(),
  {
    anchor: "occurrence-authorization-queue",
    title: "Aguardando Autorização da Torre ⏳",
    content: `Ocorrências de tipos que exigem autorização ficam aqui até alguém aprovar ou negar, com motivo.
    O motorista recebe a resposta na hora. Sem resposta em 10 minutos, o aviso sobe para os administradores.
    NOTA: Se o motorista comprovar a entrega enquanto o pedido está pendente, a comprovação prevalece.`,
    placement: "bottom",
    optional: true,
  },
  exportStep("Ocorrências", "Gerenciar Ocorrências", [
    "Tipo, categoria e gravidade",
    "Entrega, destinatário e motorista",
    "Data e local do registro",
  ]),
  revalidateStep(),
  searchStep(
    "Buscar Ocorrências 🔍",
    "Procure pelo ID da ocorrência, ID da entrega, destinatário ou tipo.",
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    `Separe o urgente do informativo:
    • Categoria: entrega, não entrega ou pausa
    • Gravidade: impeditivas (derrubam a entrega) ou informativas
    • Tipo e Status da entrega`,
  ),
  tableStep(
    "Fotos, Local e Formulário 📸",
    `Clique numa miniatura para ver a foto grande sem sair da tela; "Ver no mapa" abre o ponto exato do registro.
    IMPORTANTE: As linhas chegam da mais recente para a mais antiga: o topo da tabela é o agora da operação.`,
  ),
  rowActionsStep(
    "Ações da Ocorrência ⚙️",
    `O menu de três pontos (⋮) leva à entrega (Ver Entrega), ao histórico da ocorrência e ao atendimento ligado a ela (Ver conversa ou Abrir atendimento), e copia os IDs.`,
  ),
  viewOptionsStep(),
];

const monitoringTab: TutorialStep[] = [
  welcomeStep(
    "Monitoramento da Operação 📊",
    `A resposta rápida para "como está a operação agora?", no dia da empresa (no fuso dela).
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  {
    ...statsStep(),
    title: "Números do Dia 📈",
    content: `Os cartões contam os documentos ativos no dia: com rota hoje, na rua agora ou resolvidos hoje — a mesma conta da Torre de Controle e do painel inicial.
    • Sem rota: pendentes que ainda precisam entrar numa rota
    • Designadas: nas rotas de hoje, ainda não saíram
    • Em rota, Entregues e Insucessos do dia`,
  },
  revalidateStep(
    "Atualizar",
    "O quadro também se atualiza sozinho quando uma parada é resolvida.",
  ),
  {
    anchor: "monitoring-board",
    title: "Por Rota | Por Motorista 🚚",
    content: `Duas visões do mesmo dia:
    • Por rota: cada rota com o percentual de conclusão e uma linha de pontos por entrega (verde entregue, vermelho não entregue, cinza pendente), em tempo real
    • Por motorista: a carga do dia de cada condutor, o mais ocupado primeiro
    DICA: A posição ao vivo no mapa fica na Torre de Controle.`,
    placement: "top",
  },
];

const ticketsTab: TutorialStep[] = [
  welcomeStep(
    "Atendimentos 💬",
    `Cada assunto com o motorista é um atendimento (ticket): de uma ocorrência (aberto sozinho quando o motorista registra), de uma rota, ou iniciado pela central.
    O atendimento tem situação (aberto ou encerrado), histórico completo, quem atendeu e quem encerrou.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas para ver
    • ESCRITA em Gerenciar Entregas para responder e encerrar`,
  ),
  tabsStep(),
  {
    anchor: "chat-threads",
    title: "Lista de Atendimentos 📋",
    content: `Filtre por Abertos, Meus, Sem atendente e Aguardando autorização, ou busque por assunto, motorista ou #número.
    • Atualizar recarrega a lista
    • Novo atendimento abre um assunto com qualquer motorista ativo
    • O megafone envia um aviso em massa, individual, para os motoristas com o aplicativo`,
    placement: "right",
  },
  {
    anchor: "chat-conversation",
    variants: [
      {
        anchor: "chat-panel",
        content: `Ao abrir um atendimento, a conversa aparece aqui, com os botões de encerramento, Atendente (assumir, liberar ou transferir), Histórico e Conversa completa do motorista.
        IMPORTANTE: Encerrar o atendimento de uma ocorrência que exige autorização é o gesto de autorizar ou negar o motorista a seguir.`,
      },
    ],
    title: "A Conversa 🚚",
    content: `Mensagens em tempo real, com presença, "digitando..." e confirmação de leitura. O motorista responde com texto, foto e áudio.
    No topo ficam os botões de encerramento, Atendente (assumir, liberar ou transferir), Histórico e Conversa completa do motorista.
    IMPORTANTE: Encerrar o atendimento de uma ocorrência que exige autorização é o gesto de autorizar ou negar o motorista a seguir. As mensagens são registro da operação: não há como editar nem apagar.`,
    placement: "left",
    spotlightPadding: 4,
  },
  {
    anchor: "ops-alert-balloon",
    title: "Balão de Alertas 🔔",
    content: `Quando chega uma ocorrência, um pedido de autorização ou uma mensagem de atendimento, este balão aparece no canto inferior direito de qualquer tela e leva direto ao atendimento.
    O botão de som ao lado liga ou desliga o alerta sonoro só para você (também em Minha Conta → Notificações).`,
    placement: "top",
    // The balloon renders only while an alert is pending: explain it anyway.
    centerWhenMissing: true,
  },
];

const shippersTab: TutorialStep[] = [
  welcomeStep(
    "Embarcadores 🏭",
    `O embarcador é quem envia a carga: a sua própria empresa, um cliente que contrata o transporte ou um parceiro.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    NOTA: Embarcadores usam a mesma permissão das entregas.`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Embarcador 🆕",
    content: `Cadastra quem envia a carga: nome, CNPJ, contato e endereço (o CEP preenche cidade, bairro e rua).
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    IMPORTANTE: O CNPJ é validado e único na empresa, e um embarcador inativo não pode receber entregas novas (nem por XML ou planilha).`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Embarcadores 🔍",
    "Digite nome, CNPJ ou e-mail.",
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    `Separe os ativos dos inativos. Inativar preserva o histórico: as entregas antigas continuam ligadas ao embarcador.`,
  ),
  tableStep(
    "Tabela de Embarcadores 📋",
    "Identificador, nome, CNPJ, contato, cidade e as datas de criação e atualização.",
  ),
  rowActionsStep(
    "Ações do Embarcador ⚙️",
    `Editar Embarcador, Copiar ID e Deletar.
    IMPORTANTE: Um embarcador com entregas vinculadas não pode ser excluído; o sistema informa quantas dependem dele. Inative-o em vez de excluir.`,
  ),
  viewOptionsStep(),
];

const occurrenceTypesTab: TutorialStep[] = [
  welcomeStep(
    "Tipos de Ocorrência ⚠️",
    `O vocabulário da operação, em três categorias:
    • Entrega: a comprovação (ex.: "Entrega normal")
    • Não entrega: destinatário ausente, endereço não localizado, recusa…
    • Pausa: almoço, lanche, descanso…, cada uma ligada à natureza legal que alimenta os alertas da Lei 13.103
    Tudo o que a entrega exige é configurado por tipo: foto, foto do canhoto, assinatura na tela, formulário e autorização da torre.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Ocorrências`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Tipo 🆕",
    content: `Abre o formulário do tipo: Nome do tipo, Chave, Categoria e, conforme a categoria, as exigências (foto do canhoto, assinatura na tela, autorização da torre, ocorrência impeditiva) e o formulário com perguntas ao motorista.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Ocorrências
    NOTA: O aplicativo exige o preenchimento do formulário antes de enviar, inclusive sem internet, e a API guarda as respostas com a versão da definição.`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Tipos 🔍",
    "Digite o nome ou a descrição do tipo.",
    "deliveries-search",
  ),
  filtersStep(
    "deliveries-filters",
    "Filtre por categoria, status, se é impeditiva e se exige foto.",
  ),
  tableStep(
    "Catálogo de Tipos 📋",
    "Nome, categoria, exigências, formulário, autorização, status e datas de cada tipo.",
  ),
  rowActionsStep(
    "Ações do Tipo ⚙️",
    `Editar Tipo, Copiar ID e Deletar.
    IMPORTANTE: Um tipo já usado em ocorrências não pode ser excluído. Inative-o: ele sai da lista do motorista e o histórico continua legível.`,
  ),
  viewOptionsStep(),
];

const statusReasonsTab: TutorialStep[] = [
  welcomeStep(
    "Motivos de Status 🏷️",
    `Toda mudança manual de status de uma entrega pelo painel exige um motivo. Aqui você cadastra a lista que aparece nessa hora, para que a operação fale a mesma língua.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Motivo 🆕",
    content: `Cadastra um motivo para mudanças manuais de status.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Motivos 🔍",
    "Digite o nome ou a descrição do motivo.",
    "deliveries-search",
  ),
  filtersStep("deliveries-filters", "Separe os motivos ativos dos inativos."),
  tableStep(
    "Motivos Cadastrados 📋",
    "Cada motivo com status e datas de criação e atualização.",
  ),
  rowActionsStep("Ações do Motivo ⚙️", "Editar Motivo, Copiar ID e Deletar."),
  viewOptionsStep(),
];

const importsTab: TutorialStep[] = [
  welcomeStep(
    "Importações 📥",
    `Cada importação de planilha ou XML vira uma linha aqui, com quantas entregas entraram, quantas eram duplicadas e quantas tinham erro.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  statsStep(),
  revalidateStep(),
  filtersStep(
    "deliveries-filters",
    "Filtre por status da importação e por origem (planilha ou XML).",
  ),
  tableStep(
    "Histórico de Importações 📋",
    "Arquivo, origem, status, quantas foram importadas, duplicadas e com erro, quando foi enviada e, se for o caso, quando foi estornada.",
  ),
  rowActionsStep(
    "Ações da Importação ⚙️",
    `Ver relatório (linha a linha, com o motivo de cada recusa), Copiar ID e Estornar.
    IMPORTANTE: Estornar remove as entregas daquela importação que ainda não andaram; as já anunciadas às integrações viram "cancelada" (delivery.cancelled).`,
  ),
  viewOptionsStep(),
];

const messageTemplatesTab: TutorialStep[] = [
  welcomeStep(
    "Mensagens ao Cliente ✉️",
    `Os textos que o destinatário recebe por WhatsApp ou e-mail em cada momento da entrega, como "Saiu para entrega" e "A caminho".
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas
    IMPORTANTE: Sem mensagem escrita, nada é enviado. O Trajetto não fala com os seus clientes por conta própria.`,
  ),
  tabsStep(),
  revalidateStep(),
  {
    anchor: "message-templates",
    title: "Momentos da Entrega 🗓️",
    content: `Cada cartão é um momento e um canal. O selo diz se a mensagem está Ativa, Desativada ou Não escrita.
    • Escrever / Editar: abre o texto com as variáveis disponíveis
    • "A caminho" só é enviado quando o motorista marca a parada como a caminho e existe um modelo ativo para ele
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas para escrever e editar`,
    placement: "top",
  },
];

const proofAuditsTab: TutorialStep[] = [
  welcomeStep(
    "Auditoria de Comprovantes 🧾",
    `A fila de comprovantes de entrega para conferência: a leitura automática do canhoto (é um canhoto? o número da NF confere? há data e assinatura?) e a decisão de uma pessoa.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  tabsStep(),
  {
    anchor: "proof-audits-filters",
    title: "Na Fila, Aprovados, Rejeitados 🎯",
    content: `Os contadores separam o que falta conferir do que já foi decidido; clique num deles para filtrar a fila.
    O botão Atualizar, ao lado, busca esses números de novo.
    NOTA: Abaixo aparece com que frequência a leitura automática concordou com a pessoa nos últimos dias.`,
    placement: "bottom",
  },
];

const deliveriesTours: TutorialConfig = {
  "/dashboard/deliveries": deliveriesTab,
  "/dashboard/deliveries/occurrences": occurrencesTab,
  "/dashboard/deliveries/monitoring": monitoringTab,
  "/dashboard/deliveries/chat": ticketsTab,
  "/dashboard/deliveries/shippers": shippersTab,
  "/dashboard/deliveries/occurrence-types": occurrenceTypesTab,
  "/dashboard/deliveries/status-change-reasons": statusReasonsTab,
  "/dashboard/deliveries/imports": importsTab,
  "/dashboard/deliveries/message-templates": messageTemplatesTab,
  "/dashboard/deliveries/proof-audits": proofAuditsTab,
};

export { deliveriesTours };
