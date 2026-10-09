import type { TutorialStep } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/tutorial-provider.types";

/**
 * The tower's guided tour (UI-TWR-7), anchored on the `data-tutorial`
 * attributes of its components. Registered under "/dashboard/control-tower"
 * (and its /admin twin) by the tutorial data.
 */
const CONTROL_TOWER_TUTORIAL_STEPS: TutorialStep[] = [
  {
    anchor: "control-tower-status",
    title: "Torre de Controle 🗼",
    content: `O resumo do que está na rua agora:
      • Veículos em rota: motoristas com rota em andamento no mapa
      • Sem reportar há mais de 10 min: rota em andamento, mas o telefone parou de enviar a posição
      • Rotas concluídas: ficam 2 horas no mapa, em verde, e depois saem
      • Ao vivo: as posições chegam no instante em que o telefone envia
      NOTA: o motorista só é visto com o aplicativo aberto (o rastreamento em segundo plano ainda não está ligado).`,
    placement: "bottom",
  },
  {
    anchor: "control-tower-refresh",
    title: "Atualizar 🔄",
    content: `Busca tudo de novo: mapa, números, eventos e o trajeto do motorista aberto.
      A torre também se atualiza sozinha a cada 30 segundos e logo depois dos eventos de rota (no máximo uma vez a cada 10 segundos).`,
    placement: "bottom",
  },
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
    content: `O dia da empresa, no fuso dela: documentos com rota hoje, na rua agora ou resolvidos hoje — a mesma conta do Monitoramento e do painel. Todos os horários da torre seguem o fuso da empresa.`,
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

export { CONTROL_TOWER_TUTORIAL_STEPS };
