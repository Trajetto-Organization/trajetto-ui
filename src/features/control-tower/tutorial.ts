import type {
  TutorialConfig,
  TutorialStep,
} from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/tutorial-provider.types";

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
} from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data/factories";

/**
 * The Torre's guided tours (UI-TWR-7), one per view (meeting of 14/10/2026),
 * anchored on the `data-tutorial` attributes of its components. Key
 * "/dashboard/control-tower" is the default view (Rotas); the others are
 * "/dashboard/control-tower/<view>" (engine/tutorial-key), and /admin
 * mirrors them. The Ocorrências, Atendimentos and Auditoria tours came from
 * Entregas with their sections.
 */

const viewsStep = (): TutorialStep => ({
  anchor: "control-tower-views",
  title: "Visões da Torre 🗂️",
  content: `A torre tem cinco visões da operação:
  • Rotas: cada rota do dia com o andamento (a visão padrão)
  • Painel: o mapa da frota e os números do dia
  • Ocorrências, Atendimentos e Auditoria: o que os motoristas registram, as conversas com eles e a conferência dos comprovantes
  NOTA: A torre lembra, neste navegador, a última visão escolhida. A visão fica na URL, então um link compartilhado reabre a mesma tela. Você só vê as visões que o seu perfil pode ler.`,
  placement: "bottom",
});

const liveStep = (): TutorialStep => ({
  anchor: "control-tower-live",
  title: "Atualização e Tela Cheia 📺",
  content: `A torre se atualiza sozinha a cada 1 minuto; troque para 3 ou 5 minutos no seletor ao lado (vale para este navegador). Ao lado fica a hora da última atualização.
  Os eventos das rotas e as posições continuam chegando na hora, pelo tempo real.
  DICA: Tela cheia expande a torre para uma TV ou um monitor da operação; Esc sai.`,
  placement: "bottom",
});

const routesView: TutorialStep[] = [
  welcomeStep(
    "Torre de Controle 🗼",
    `A resposta rápida para "como está a operação agora?", no dia da empresa (no fuso dela).
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  viewsStep(),
  liveStep(),
  {
    ...statsStep(),
    title: "Números do Dia 📈",
    content: `Os cartões contam os documentos ativos no dia: com rota hoje, na rua agora ou resolvidos hoje — a mesma conta do Painel e do painel inicial.
    • Sem rota: pendentes que ainda precisam entrar numa rota
    • Designadas: nas rotas de hoje, ainda não saíram
    • Em rota, Entregues e Insucessos do dia`,
  },
  {
    anchor: "monitoring-board",
    title: "Rotas do Dia 🚚",
    content: `Cada rota com o percentual de conclusão, quantas paradas já foram resolvidas ("X de Y") e uma linha de pontos por entrega (verde entregue, vermelho não entregue, cinza pendente), em tempo real.
    Clique num ponto para abrir a entrega.
    DICA: A posição ao vivo dos veículos fica no Painel.`,
    placement: "top",
  },
];

const panelView: TutorialStep[] = [
  {
    anchor: "control-tower-status",
    title: "Painel da Torre 🗼",
    content: `O resumo do que está na rua agora:
      • Veículos em rota: motoristas com rota em andamento no mapa
      • Sem reportar há mais de 10 min: rota em andamento, mas o telefone parou de enviar a posição
      • Rotas concluídas: ficam 2 horas no mapa, em verde, e depois saem
      • Ao vivo: as posições chegam no instante em que o telefone envia
      NOTA: o motorista só é visto com o aplicativo aberto (o rastreamento em segundo plano ainda não está ligado).`,
    placement: "bottom",
  },
  viewsStep(),
  {
    anchor: "control-tower-refresh",
    title: "Atualizar 🔄",
    content: `Busca tudo de novo: mapa, números, eventos e o trajeto do motorista aberto.
      A torre também se atualiza sozinha no intervalo escolhido (1, 3 ou 5 minutos) e logo depois dos eventos de rota (no máximo uma vez a cada 10 segundos).`,
    placement: "bottom",
  },
  liveStep(),
  {
    anchor: "control-tower-map",
    title: "Mapa da frota 🗺️",
    content: `Clique num veículo para ver o trajeto do dia. Um número agrupa veículos próximos: clique nele para aproximar.
      No computador, clique no mapa para ampliar com a roda do mouse; no celular, use dois dedos.`,
    placement: "top",
  },
  {
    anchor: "control-tower-active-routes",
    title: "Rotas em andamento 🚚",
    content: `Toda rota na rua, com o destino, a hora de saída, o progresso das paradas e o último sinal do telefone, mesmo antigo.
      Uma rota sem posição (permissão negada, aplicativo fechado) aparece aqui mesmo sem ponto no mapa.`,
    placement: "top",
  },
  {
    anchor: "occurrence-authorization-queue",
    title: "Aguardando autorização ⏳",
    content: `Pedidos de motoristas que só seguem com a autorização da torre. Aprove ou negue com motivo; o motorista recebe a resposta na hora.
      Sem resposta em 10 minutos, o aviso sobe para os administradores.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "control-tower-funnel",
    title: "Documentos de hoje 📦",
    content: `O dia da empresa, no fuso dela: documentos com rota hoje, na rua agora ou resolvidos hoje — a mesma conta da visão Rotas e do painel inicial. Todos os horários da torre seguem o fuso da empresa.`,
    placement: "top",
  },
  {
    anchor: "control-tower-progress",
    title: "Finalizadas hoje ✅",
    content: `Entregues, insucessos e canceladas resolvidos hoje, no dia da empresa.`,
    placement: "top",
    optional: true,
  },
  {
    anchor: "control-tower-punctuality",
    title: "Pontualidade de saída ⏱️",
    content: `Compara a saída real com a planejada, com 15 minutos de tolerância.
      • Aguardando saída: o horário ainda não chegou (fora da taxa)
      • Não saíram: o horário passou e a rota ainda não saiu (conta como atraso)`,
    placement: "top",
  },
  {
    anchor: "control-tower-events",
    title: "Últimos eventos ⚡",
    content: `Chegadas, comprovações, ocorrências, insucessos e saída, conclusão ou cancelamento de rotas de hoje.
      Clique num evento de entrega para abrir a entrega.`,
    placement: "left",
  },
];

const occurrencesView: TutorialStep[] = [
  welcomeStep(
    "Ocorrências 📋",
    `Tudo o que o motorista registrou nas entregas, numa tabela só: entregas normais, não entregas e pausas, com fotos, local e respostas do formulário do tipo.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Ocorrências`,
  ),
  viewsStep(),
  statsStep(),
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

const ticketsView: TutorialStep[] = [
  welcomeStep(
    "Atendimentos 💬",
    `Cada assunto com o motorista é um atendimento (ticket): de uma ocorrência (aberto sozinho quando o motorista registra), de uma rota, ou iniciado pela central.
    O atendimento tem situação (aberto ou encerrado), histórico completo, quem atendeu e quem encerrou.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas para ver
    • ESCRITA em Gerenciar Entregas para responder e encerrar
    NOTA: O número de atendimentos não lidos aparece na visão Atendimentos e no menu da Torre de Controle.`,
  ),
  viewsStep(),
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

const auditView: TutorialStep[] = [
  welcomeStep(
    "Auditoria de Comprovantes 🧾",
    `A fila de comprovantes de entrega para conferência: a leitura automática do canhoto (é um canhoto? o número da NF confere? há data e assinatura?) e a decisão de uma pessoa.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  viewsStep(),
  {
    anchor: "proof-audits-filters",
    title: "Na Fila, Aprovados, Rejeitados 🎯",
    content: `Os contadores separam o que falta conferir do que já foi decidido; clique num deles para filtrar a fila.
    O botão Atualizar, ao lado, busca esses números de novo.
    NOTA: Abaixo aparece com que frequência a leitura automática concordou com a pessoa nos últimos dias.`,
    placement: "bottom",
  },
];

const CONTROL_TOWER_TOURS: TutorialConfig = {
  "/dashboard/control-tower": routesView,
  "/dashboard/control-tower/panel": panelView,
  "/dashboard/control-tower/occurrences": occurrencesView,
  "/dashboard/control-tower/tickets": ticketsView,
  "/dashboard/control-tower/audit": auditView,
};

/** The Painel's steps, as the tour of the tower before its views. */
const CONTROL_TOWER_TUTORIAL_STEPS = panelView;

export { CONTROL_TOWER_TOURS, CONTROL_TOWER_TUTORIAL_STEPS };
