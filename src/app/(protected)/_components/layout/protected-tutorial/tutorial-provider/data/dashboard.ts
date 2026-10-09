import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import { welcomeStep } from "./factories";

/**
 * The global tour (/dashboard) and the dashboard's other tabs. The only tour
 * that opens by itself on a phone (decision 9.3).
 */

const backToOverviewStep = (): TutorialStep => ({
  anchor: "overview-tab",
  title: "Voltar à Visão Geral 🔄",
  content: `Para voltar aos cartões, à operação do dia e às atividades recentes, clique na aba "Visão geral".`,
  placement: "bottom",
});

const dashboardTour: TutorialStep[] = [
  welcomeStep(
    "Bem-vindo ao Trajetto! 📊",
    `Este é o painel inicial: o resumo da operação da sua empresa, conforme os módulos contratados e o que o seu perfil pode ver.
    A partir daqui você chega a qualquer tela pelo menu lateral, pelos atalhos ou pela busca.`,
  ),
  {
    anchor: "dashboard-tabs",
    title: "Abas do Painel 📑",
    content: `• Visão geral: cartões, operação de hoje, atividades recentes e atalhos
    • Análise Gráfica: a evolução dos números da empresa ao longo do tempo
    • Limites de Uso: o consumo da leitura automática de fotos
    NOTA: Análise Gráfica e Limites de Uso aparecem para administradores. Cada aba tem o seu tutorial.`,
    placement: "bottom",
  },
  {
    anchor: "revalidate",
    title: "Atualizar 🔄",
    content: `Busca de novo os números do painel, sem recarregar a página.
    NOTA: Aceita alguns cliques seguidos e depois pede alguns segundos de espera.`,
    placement: "bottom",
  },
  {
    anchor: "sidebar-menu",
    title: "Menu de Navegação 📍",
    content: `Cada item leva a uma área da plataforma; você só vê as páginas que o seu perfil e os módulos da empresa permitem.
    DICA: Ctrl + B recolhe ou expande o menu.`,
    placement: "right",
    spotlightPadding: 2,
    mobile: { openSidebar: true },
  },
  {
    anchor: "search",
    title: "Busca Rápida ⚡",
    content:
      "Ctrl + K abre a busca: digite o nome de qualquer tela para ir direto a ela.",
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "dashboard-cards",
    title: "Cartões 📇",
    content: `Os totais das áreas que você pode abrir, conforme os módulos contratados e o seu perfil.
    DICA: A cor indica a variação em relação ao período anterior.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "operation-panel",
    title: "Operação de Hoje 🚚",
    content: `Para quem tem o módulo Entregas, o retrato do dia da empresa (no fuso dela):
    • Agora: Sem rota, Designadas (nas rotas de hoje, ainda não saíram) e Em rota
    • Hoje: Entregues, Insucessos e Ocorrências
    O link Abrir entregas leva direto à operação.`,
    placement: "top",
    optional: true,
    requiresPath: "/dashboard/deliveries",
  },
  {
    anchor: "recent-activity",
    title: "Atividades Recentes 📈",
    content: `As últimas ações feitas na plataforma: o quê, por quem e quando.
    NOTA: Administradores têm o botão Ver todas, que abre a tela Atividades completa.`,
    placement: "top",
  },
  {
    anchor: "quick-links",
    title: "Acesso Rápido 🚀",
    content: "Atalhos para as áreas mais usadas, sem passar pelo menu.",
    placement: "top",
    optional: true,
  },
  {
    anchor: "help",
    title: "Ver Tutorial ℹ️",
    content:
      "Reabra o tutorial da tela em que estiver por aqui (ou pela tecla ?). Cada tela tem o seu.",
    placement: "top",
    mobile: { openSidebar: true },
  },
  {
    anchor: "account",
    title: "Sua Conta 👤",
    content:
      "Perfil, senha, verificação em duas etapas, preferências de notificação e sair.",
    placement: "top",
    optional: true,
    mobile: { openSidebar: true },
  },
];

const chartsTour: TutorialStep[] = [
  welcomeStep(
    "Análise Gráfica 📊",
    "A evolução dos números da empresa ao longo do tempo, para enxergar padrões.",
  ),
  {
    anchor: "area-chart",
    title: "Gráfico de Tendências 📈",
    content: `A evolução dos registros no período, uma linha para cada área que a sua empresa usa.
    DICA: Cada cor é uma categoria; passe o mouse para ver os valores.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "area-chart-time-selector",
    title: "Período 📅",
    content:
      "7 ou 30 dias (por dia) ou 3 e 6 meses (por mês). O gráfico se atualiza ao trocar.",
    placement: "left",
    optional: true,
  },
  {
    anchor: "bar-chart",
    title: "Custos de Manutenção 💰",
    content: `A divisão dos custos entre manutenção interna (oficina própria) e externa (terceiros), com o total de cada período.`,
    placement: "top",
    optional: true,
  },
  {
    anchor: "bar-chart-time-selector",
    title: "Período dos Custos 📅",
    content: "Compare os gastos entre períodos e perceba sazonalidades.",
    placement: "left",
    optional: true,
  },
  backToOverviewStep(),
];

const limitsTour: TutorialStep[] = [
  welcomeStep(
    "Limites de Uso ⚡",
    "O consumo dos serviços com cota da empresa no período atual e quanto ainda resta.",
  ),
  {
    anchor: "ai-usage-card",
    title: "Leitura Automática de Fotos 🤖",
    content: `As fotos enviadas pelo aplicativo são lidas na infraestrutura da Trajetto. Cada foto analisada conta uma vez, e o cartão mostra quantas cada tipo usou, conforme os módulos contratados.
    O selo indica Ativo, Uso elevado, Limite atingido ou Desabilitado; abaixo, as fotos restantes e a data do próximo reinício.
    NOTA: Com o limite atingido, novas análises esperam o próximo período.`,
    placement: "bottom",
    spotlightPadding: 8,
  },
  backToOverviewStep(),
];

const systemTour: TutorialStep[] = [
  welcomeStep(
    "Sistema 🖥️",
    "A saúde da plataforma para a equipe Trajetto: workers e filas de processos de fundo, eventos enviados aos sistemas dos clientes, conexões do banco e o event loop. Só o MASTER vê esta aba.",
  ),
  {
    anchor: "system-content",
    title: "Métricas da Plataforma 📈",
    content:
      "Pendentes, em execução, falhas das últimas 24 h, dead-letter e o item mais antigo de cada fila. Use Atualizar para buscar os valores mais recentes.",
    placement: "top",
  },
  backToOverviewStep(),
];

const dashboardTours: TutorialConfig = {
  "/dashboard": dashboardTour,
  "/dashboard/charts": chartsTour,
  "/dashboard/limits": limitsTour,
};

export { dashboardTours, dashboardTour, chartsTour, limitsTour, systemTour };
