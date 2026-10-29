import { CONTROL_TOWER_TOURS } from "@/features/control-tower/tutorial";

import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import {
  filtersStep,
  revalidateStep,
  rowActionsStep,
  searchStep,
  statsStep,
  tableStep,
  viewOptionsStep,
  welcomeStep,
} from "./factories";

/** Rotas, the route page, Torre, Pausas, Integrações, Kanban and Atividades. */

const routesTour: TutorialStep[] = [
  welcomeStep(
    "Rotas 🗺️",
    `A rota é a unidade de atribuição: as entregas entram numa rota, e o motorista e o veículo pertencem à rota.
    Planeje, defina a sequência das paradas e libere para o motorista quando estiver pronta.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas`,
  ),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Nova Rota 🆕",
    content: `Planeja uma rota: Data da rota (obrigatória), nome, destino, motorista, veículo e saída e retorno previstos.
    PERMISSÕES NECESSÁRIAS:
    • ESCRITA em Gerenciar Entregas
    NOTA: O veículo é opcional no planejamento e obrigatório para liberar a rota ao motorista. O retorno não pode ser antes da saída, e a saída é no dia da rota.
    DICA: A atribuição avisa (sem bloquear) CNH incompatível ou vencida, ordem de serviço aberta e checklist reprovado.`,
    placement: "bottom",
    optional: true,
  },
  searchStep(
    "Buscar Rotas 🔍",
    "Procure pelo nome, destino, motorista ou número da rota.",
    "routes-search",
  ),
  filtersStep("routes-filters", "Filtre por status, motorista e veículo."),
  tableStep(
    "Tabela de Rotas 📋",
    `Cada rota com status, paradas, motorista, veículo, data (só o dia), destino, horários previstos, saída e conclusão.
    DICA: Clique no código da rota para abrir a página dela.`,
  ),
  rowActionsStep(
    "Ações da Rota ⚙️",
    `Ver detalhes, Editar rota, Liberar para o motorista (ou Voltar ao planejamento), Copiar ID e Cancelar rota.
    NOTA: Uma ação bloqueada pelo estado da rota aparece desabilitada com o motivo.`,
  ),
  viewOptionsStep(),
];

const routeDetailTour: TutorialStep[] = [
  welcomeStep(
    "Página da Rota 🧭",
    `Tudo sobre uma rota numa tela: os dados, as entregas na ordem de visita, o mapa e os atendimentos.
    PERMISSÕES NECESSÁRIAS:
    • LEITURA em Gerenciar Entregas para ver
    • ESCRITA em Gerenciar Entregas para alterar`,
  ),
  {
    anchor: "route-header",
    title: "Dados da Rota 📌",
    content:
      "Código e nome, status, motorista, veículo, data, horários previstos e destino.",
    placement: "bottom",
  },
  revalidateStep(),
  {
    anchor: "route-actions",
    title: "Ações da Rota ⚙️",
    content: `• Editar rota: muda os dados do planejamento
    • Liberar para o motorista: a rota chega ao aplicativo dele (exige veículo, ao menos uma parada e a ordem salva); Voltar ao planejamento desfaz
    • Cancelar rota: pede um motivo; as paradas não resolvidas voltam para a lista de entregas disponíveis e o que já foi entregue continua valendo (nada é apagado)
    NOTA: Um botão bloqueado mostra o motivo ao passar o mouse.`,
    placement: "bottom",
  },
  {
    anchor: "route-stops",
    title: "Entregas da Rota 📦",
    content: `A ordem desta lista é a ordem de visita. Arraste (ou use as setas) para mudar a sequência e salve.
    No menu de cada parada: Mover para a posição…, Fixar no mapa e Remover da rota.
    IMPORTANTE: Se outra pessoa alterar a rota enquanto você mexe na ordem, a tela avisa e oferece recarregar.`,
    placement: "right",
  },
  {
    anchor: "route-add-deliveries",
    title: "Adicionar Entregas ➕",
    content:
      "Abre a lista das entregas ainda sem rota, com busca e seleção, para colocar nesta rota.",
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "route-map",
    title: "Mapa da Rota 🗺️",
    content: `As paradas numeradas na ordem de visita e, com a rota em andamento, a posição do motorista e o trajeto feito.
    NOTA: O motorista só é visto com o aplicativo aberto.`,
    placement: "left",
  },
  {
    anchor: "route-conversations",
    title: "Atendimentos da Rota 💬",
    content:
      "Os atendimentos ligados a esta rota e o que foi dito sobre ela na conversa do motorista, com o atalho para abrir cada um em Atendimentos.",
    placement: "top",
    optional: true,
  },
];

const pausesTour: TutorialStep[] = [
  welcomeStep(
    "Pausas dos Motoristas ☕",
    `As pausas que os motoristas registram no aplicativo (almoço, lanche, descanso…), por motorista e dia, com os alertas da Lei 13.103/2015: refeição de 1 h, descanso de 30 min a cada 6 h de direção e interjornada de 11 h.
    NOTA: Os alertas só sinalizam; nada é bloqueado. Pausa só existe dentro de uma jornada (rota liberada ou em andamento no dia).`,
  ),
  statsStep(),
  revalidateStep(),
  {
    anchor: "pauses-period",
    title: "Período 📅",
    content:
      "Clique no período para abrir o calendário: escolha o dia inicial e o dia final (até 31 dias) e clique em Aplicar. Os dias seguem o fuso da empresa.",
    placement: "bottom",
  },
  filtersStep("pauses-filters", "Filtre por motorista e por tipo de alerta."),
  {
    anchor: "pauses-table",
    title: "Jornadas e Pausas 📋",
    content:
      "Cada linha é um motorista num dia: jornada, quantidade de pausas, tempo em pausa, direção estimada e os alertas.",
    placement: "top",
  },
  {
    anchor: "pauses-rules",
    title: "Como é Calculado 📐",
    content:
      "Abra esta nota para ver exatamente como a jornada, a direção estimada e cada alerta são contados.",
    placement: "top",
    optional: true,
  },
  viewOptionsStep(),
];

const integrationsIntro = (title: string, content: string): TutorialStep[] => [
  welcomeStep(title, content),
  {
    anchor: "integrations-tabs",
    title: "Seções de Integrações 📑",
    content: `• Chaves de API: o que cada sistema integrado pode ler e escrever
    • Webhooks: avisos assinados enviados aos sistemas dos seus clientes
    • Monitor de Envios: o que foi entregue, o que falhou e o que está na fila
    • Uso da API: as chamadas recebidas por dia
    NOTA: Integrações exigem o módulo Entregas e a permissão Gerenciar Integrações.`,
    placement: "bottom",
  },
  {
    anchor: "integrations-docs",
    title: "Documentação da API 📘",
    content:
      "Abre, em nova aba, o portal com os guias (autenticação, escopos, paginação, idempotência, erros, limites e webhooks) e a referência de cada rota.",
    placement: "bottom",
    optional: true,
  },
];

const integrationsTours: TutorialConfig = {
  "/dashboard/integrations/api-keys": [
    ...integrationsIntro(
      "Chaves de API 🔑",
      "Uma chave por sistema integrado. O segredo aparece uma única vez, na emissão; guarde-o num cofre de senhas.",
    ),
    revalidateStep("Atualizar"),
    {
      anchor: "create-button",
      title: "Nova Chave 🆕",
      content: `Emite uma chave escolhendo os escopos: o que o sistema pode ler (entregas, ocorrências, comprovantes) e se pode criar entregas (deliveries:write).
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Integrações`,
      placement: "bottom",
      optional: true,
    },
    {
      anchor: "integrations-api-keys",
      title: "Chaves Emitidas 📋",
      content: `Cada chave com o nome, os escopos e o Último uso.
      IMPORTANTE: Revogar é imediato e definitivo: a próxima chamada com a chave já é recusada.`,
      placement: "top",
    },
  ],
  "/dashboard/integrations/webhooks": [
    ...integrationsIntro(
      "Webhooks 📡",
      "Um POST assinado por evento para o sistema do cliente, com novas tentativas por cerca de sete horas antes de desistir.",
    ),
    revalidateStep("Atualizar"),
    {
      anchor: "create-button",
      title: "Novo Endpoint 🆕",
      content: `Cadastra a URL que recebe os eventos e escolhe os tópicos ("Todos os eventos" de Documentos assina entregas, ocorrências e comprovantes).
      PERMISSÕES NECESSÁRIAS:
      • ESCRITA em Gerenciar Integrações
      NOTA: Até 10 endpoints por empresa.`,
      placement: "bottom",
      optional: true,
    },
    {
      anchor: "integrations-webhooks",
      title: "Endpoints 📋",
      content: `Cada endpoint com os tópicos e o estado.
      • Pausado: eventos novos não são gravados para ele
      • Desligado por falhas: muitas falhas seguidas abrem o disjuntor; use Reativar depois de corrigir o sistema do cliente`,
      placement: "top",
    },
  ],
  "/dashboard/integrations/monitor": [
    ...integrationsIntro(
      "Monitor de Envios 📈",
      "O que os webhooks entregaram ao sistema dos seus clientes, o que esgotou as tentativas e o que ainda vai sair.",
    ),
    {
      anchor: "integrations-monitor",
      title: "Envios do Período 📋",
      content: `Os cartões contam entregues, falhas e na fila; p95 é o tempo de resposta do sistema do cliente nas entregas bem-sucedidas.
      Filtre por situação e período; clique num envio para ver os detalhes e, se falhou, Reenviar.
      NOTA: "Na fila" é tudo o que ainda vai sair, de qualquer data; o resto é do período escolhido.`,
      placement: "top",
    },
  ],
  "/dashboard/integrations/usage": [
    ...integrationsIntro(
      "Uso da API 📊",
      "As chamadas que os sistemas integrados fizeram ao Trajetto, por dia e por resultado.",
    ),
    {
      anchor: "integrations-usage",
      title: "Chamadas por Dia 📋",
      content: `Escolha o período e veja o total de chamadas, os erros do lado do cliente (4xx) e os nossos (5xx).
      DICA: Um sistema que deveria estar chamando e não aparece aqui provavelmente está com a chave errada ou revogada.`,
      placement: "top",
    },
  ],
};

const kanbanTour: TutorialStep[] = [
  welcomeStep(
    "Kanban 🗂️",
    `Um quadro de tarefas da empresa: colunas para as etapas e cards para cada tarefa, com responsáveis.
    NOTA: Quem não administra o quadro vê apenas os cards atribuídos a si.`,
  ),
  {
    anchor: "kanban-search",
    title: "Buscar no Quadro 🔍",
    content:
      "Procure por ID, coluna, card ou usuário. O quadro mostra só o que combina com a busca.",
    placement: "bottom",
  },
  // The board's button keeps the default label.
  revalidateStep("Atualizar"),
  {
    anchor: "kanban-add-column",
    title: "Adicionar Coluna ➕",
    content:
      "Cria uma etapa nova no quadro (por exemplo: A fazer, Em andamento, Concluído).",
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "kanban-board",
    variants: [
      {
        anchor: "kanban-empty",
        content:
          "O quadro ainda não tem colunas. Comece por Adicionar Coluna e depois crie os cards dentro dela.",
      },
    ],
    title: "O Quadro 📋",
    content:
      "Arraste os cards entre as colunas para mudar a etapa; clique num card para ver e editar os detalhes.",
    placement: "top",
  },
  {
    anchor: "kanban-column-menu",
    title: "Menu da Coluna ⚙️",
    content: "Editar o título da coluna ou Excluir a coluna.",
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "kanban-add-card",
    title: "Adicionar Card ➕",
    content:
      "Cria uma tarefa nesta coluna, com título, descrição e responsáveis.",
    placement: "top",
    optional: true,
  },
];

const activityTour: TutorialStep[] = [
  welcomeStep(
    "Atividades 🕘",
    "A trilha de auditoria da empresa: quem fez o quê e quando, em todas as telas.",
  ),
  revalidateStep(),
  {
    anchor: "activity-view-switch",
    title: "Linha do Tempo ou Tabela 🔀",
    content:
      "A linha do tempo conta a história na ordem dos fatos; a tabela permite buscar e filtrar.",
    placement: "bottom",
  },
  {
    anchor: "activity-period",
    title: "Período 📅",
    content: "Últimos 7 ou 30 dias, contados no dia da empresa.",
    placement: "bottom",
  },
  statsStep(),
  {
    anchor: "activity-timeline",
    variants: [{ anchor: "data-table" }],
    title: "As Atividades 📋",
    content:
      "Cada ação com o tipo, a descrição, quem fez e quando. Role até o fim para carregar mais.",
    placement: "top",
  },
];

const operationsTours: TutorialConfig = {
  "/dashboard/routes": routesTour,
  "/dashboard/routes/:routeId": routeDetailTour,
  ...CONTROL_TOWER_TOURS,
  "/dashboard/driver-pauses": pausesTour,
  ...integrationsTours,
  "/dashboard/kanban": kanbanTour,
  "/dashboard/activity": activityTour,
};

export { operationsTours, kanbanTour };
