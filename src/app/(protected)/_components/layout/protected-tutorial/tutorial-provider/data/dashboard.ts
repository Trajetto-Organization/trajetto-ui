import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import { MAINTENANCE_DUE_SOON_DAYS } from "@/app/(protected)/_components/overview-dashboard/charts/maintenance-status/rules";
import { AI_HIGH_USAGE_PERCENT } from "@/app/(protected)/_components/shared/limits/limits-content/lib/ai-usage-copy";
import { VEHICLE_SLOT_HIGH_USAGE_PERCENT } from "@/lib/vehicle-slot-usage";

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
    • Análise Gráfica: a evolução dos números ao longo do tempo
    • Limites de Uso: as cotas e as vagas do plano (leitura automática de fotos e veículos)
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

/**
 * Each step says the metric as the API counts it: new records by creation
 * date (not running totals), costs by the service order's creation date,
 * and the maintenance rule of maintenance-standing.ts — the thresholds come
 * from the same constants the cards read.
 */
const chartsTour: TutorialStep[] = [
  welcomeStep(
    "Análise Gráfica 📊",
    "A evolução dos números ao longo do tempo, para enxergar padrões.",
  ),
  {
    anchor: "area-chart",
    title: "Gráfico de Tendências 📈",
    content: `Quantos registros novos foram cadastrados em cada dia ou em cada mês, pela data de cadastro: não é o total acumulado. Uma linha para cada área que o seu perfil pode ver e que a empresa contratou.
    DICA: Cada cor é uma área; passe o mouse para ver os valores. O último ponto é o dia ou o mês em andamento.`,
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "area-chart-time-selector",
    title: "Período 📅",
    content:
      "Últimos 7 ou 30 dias (um ponto por dia) ou 3 e 6 meses (um ponto por mês). O gráfico se atualiza ao trocar.",
    placement: "left",
    optional: true,
  },
  {
    anchor: "maintenance-status",
    title: "Manutenção da Frota 🔧",
    content: `A situação de hoje da próxima revisão de cada veículo cadastrado, inclusive os inativos. A revisão vence pela data (última revisão + intervalo em meses) ou pela quilometragem (km da última revisão + intervalo em km), o que vier primeiro. Não muda com o período dos gráficos.
    • Atrasada: a data prevista já passou (vencer hoje ainda não é atraso) ou a quilometragem atual chegou à da revisão
    • A vencer: vence entre hoje e os próximos ${MAINTENANCE_DUE_SOON_DAYS} dias, ou o veículo está sem registro — sem a data da última revisão não há como calcular a próxima, mesmo que a quilometragem já tenha passado; o cartão mostra quantos estão sem registro
    • Em dia: a próxima revisão é depois de ${MAINTENANCE_DUE_SOON_DAYS} dias e a quilometragem ainda não chegou à da revisão
    DICA: A data e a quilometragem da última revisão ficam no cadastro do veículo; uma ordem de serviço concluída com a quilometragem após o serviço também as atualiza. Sem a quilometragem registrada, a conta parte de zero.`,
    placement: "top",
    optional: true,
  },
  {
    anchor: "bar-chart",
    title: "Custos de Manutenção 💰",
    content: `A soma do valor total das ordens de serviço, separada em manutenção interna (oficina própria) e externa (terceiros), pela data em que cada ordem foi cadastrada.
    NOTA: O rodapé compara o período em andamento (o mês ou o dia de hoje, ainda incompleto) com o anterior e nomeia os dois; um aumento de custo aparece em amarelo e uma redução em verde.`,
    placement: "top",
    optional: true,
  },
  {
    anchor: "bar-chart-time-selector",
    title: "Período dos Custos 📅",
    content:
      "Últimos 7 ou 30 dias (um ponto por dia) ou 3 e 6 meses (um ponto por mês), para comparar os gastos entre períodos e perceber sazonalidades.",
    placement: "left",
    optional: true,
  },
  backToOverviewStep(),
];

const limitsTour: TutorialStep[] = [
  welcomeStep(
    "Limites de Uso ⚡",
    "As cotas e as vagas contratadas pela empresa: quanto já foi usado e quanto ainda resta.",
  ),
  {
    anchor: "ai-usage-card",
    title: "Leitura Automática de Fotos 🤖",
    content: `As fotos enviadas pelo aplicativo são lidas na infraestrutura da Trajetto. Cada foto analisada conta uma vez, e o cartão mostra quantas cada tipo usou, conforme os módulos contratados.
    O selo indica Ativo, Uso elevado (a partir de ${AI_HIGH_USAGE_PERCENT}%), Limite atingido ou Desabilitado; abaixo, as fotos restantes e a data do próximo reinício. Análises em andamento já reservam a sua parte da cota.
    NOTA: Com o limite atingido, as fotos novas não são lidas e a análise do registro fica como não realizada; se restar só parte da cota, o registro é lido em parte. Nada é refeito sozinho: depois da renovação, use Verificar novamente com IA no registro.`,
    placement: "bottom",
    spotlightPadding: 8,
  },
  {
    // Shared by both modules: no word of either (module-gating test).
    anchor: "vehicle-limit-card",
    title: "Veículos 🚚",
    content: `Quantos veículos ocupam vaga do plano e quantos foram contratados. Ocupa vaga todo veículo que não está Inativo, por isso o número pode ser maior que o de Ativos da tela Veículos; inativar libera a vaga e mantém o histórico.
    O selo indica Dentro do limite, Uso elevado (a partir de ${VEHICLE_SLOT_HIGH_USAGE_PERCENT}%), Limite atingido, Acima do limite ou Sem limite (nenhum limite configurado); abaixo, as vagas restantes, os veículos por situação e o total cadastrado.
    NOTA: Com todas as vagas em uso, novos cadastros e reativações são recusados até um veículo ser inativado ou o plano ser ampliado.`,
    placement: "bottom",
    spotlightPadding: 8,
  },
  {
    // Fines are Gestão de Frotas: the card, and so the step, only with it.
    anchor: "fine-lookup-card",
    title: "Consulta de Multas 📋",
    content: `A consulta automática de multas não faz parte desta versão: não há cota nem consumo a acompanhar.
    DICA: As multas recebidas são registradas na tela Multas, que o link do cartão abre.`,
    placement: "top",
    optional: true,
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
