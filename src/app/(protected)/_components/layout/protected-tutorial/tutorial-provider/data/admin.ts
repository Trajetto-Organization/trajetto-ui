import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import {
  filtersStep,
  forBackOffice,
  revalidateStep,
  rowActionsStep,
  searchStep,
  statsStep,
  tableStep,
  viewOptionsStep,
  welcomeStep,
} from "./factories";
import { chartsTour, dashboardTour, limitsTour, systemTour } from "./dashboard";

/**
 * The back office (/admin), on demand only (decision 9.2): the MASTER opens
 * a tour from "Ver Tutorial" or "?". Company screens reuse the /dashboard
 * tour of the same page with the company selector first and without the
 * permission talk (the MASTER holds every permission).
 */

/** Company pages whose /admin twin renders the same feature component. */
const MIRRORED_PREFIXES = [
  "/dashboard/branch",
  "/dashboard/fine",
  "/dashboard/driver",
  "/dashboard/fuel-type",
  "/dashboard/part",
  "/dashboard/permission",
  "/dashboard/profile-access",
  "/dashboard/service-order-part",
  "/dashboard/service-order",
  "/dashboard/supplier",
  "/dashboard/user-registration",
  "/dashboard/vehicle-type",
  "/dashboard/vehicle",
  "/dashboard/account-payable",
  "/dashboard/fuel",
  "/dashboard/vehicle-checklist",
  "/dashboard/deliveries",
  "/dashboard/routes",
  "/dashboard/control-tower",
  "/dashboard/driver-pauses",
  "/dashboard/integrations",
  "/dashboard/kanban",
  "/dashboard/activity",
];

/** Mirrored pages that span every company on /admin: no selector there. */
const ACROSS_COMPANIES = new Set(["/dashboard/activity"]);

function isMirrored(key: string): boolean {
  return MIRRORED_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(`${prefix}/`),
  );
}

const businessTour: TutorialStep[] = [
  welcomeStep(
    "Empresas 🏢",
    "As transportadoras clientes da plataforma: cadastro, módulos contratados e limites de cada uma.",
  ),
  statsStep(),
  revalidateStep(),
  searchStep(
    "Buscar Empresas 🔍",
    "Procure por razão social, nome fantasia, CNPJ, e-mail, cidade, código ERP ou responsável.",
  ),
  filtersStep("business-filters", "Filtre por status e UF da empresa."),
  tableStep(
    "Empresas Cadastradas 📋",
    "Cada empresa com os dados cadastrais, status e datas.",
  ),
  rowActionsStep(
    "Ações da Empresa ⚙️",
    `• Editar Empresa: dados cadastrais e fuso horário
    • Configurar Limite IA e Limite de Veículos
    • Módulos Contratados: liga ou desliga Frotas e Entregas (o acesso dos usuários muda na hora)
    • Copiar ID`,
  ),
  viewOptionsStep(),
];

const quoteTour: TutorialStep[] = [
  welcomeStep(
    "Orçamentos 💼",
    "Os pedidos de orçamento enviados pelo site público, para acompanhar cada contato até a decisão.",
  ),
  statsStep(),
  revalidateStep(),
  searchStep(
    "Buscar Orçamentos 🔍",
    "Procure por nome, empresa, e-mail, telefone, mensagem ou anotações.",
  ),
  filtersStep("quote-filters", "Filtre por status e tamanho da frota."),
  tableStep(
    "Pedidos Recebidos 📋",
    "Cada pedido com o contato, o tamanho da frota, o status e a data.",
  ),
  rowActionsStep(
    "Ações do Orçamento ⚙️",
    "Ver detalhes, Atualizar status, Copiar ID, Copiar e-mail e Excluir.",
  ),
  viewOptionsStep(),
];

const masterUsersTour: TutorialStep[] = [
  welcomeStep(
    "Usuários Masters 👑",
    "As contas da equipe Trajetto com acesso ao back office de todas as empresas.",
  ),
  statsStep(),
  revalidateStep(),
  {
    anchor: "create-button",
    title: "Novo Master 🆕",
    content: `Cria uma conta master. A pessoa recebe por e-mail um link para definir a própria senha (válido por 72 horas); nenhuma senha vai por e-mail.
    IMPORTANTE: Um master enxerga e altera os dados de todas as empresas. Conceda com parcimônia.`,
    placement: "bottom",
    optional: true,
  },
  searchStep("Buscar Masters 🔍", "Procure por nome ou e-mail."),
  filtersStep(
    "master-user-filters",
    "Filtre por acesso e verificação em duas etapas (2FA).",
  ),
  tableStep(
    "Contas Masters 📋",
    "Cada conta com nome, e-mail, situação do acesso e 2FA.",
  ),
  rowActionsStep(
    "Ações da Conta ⚙️",
    "Editar Master (inclusive enviar um novo link de redefinição de senha), Copiar ID e Deletar Master.",
  ),
  viewOptionsStep(),
];

function buildAdminTours(companyTours: TutorialConfig): TutorialConfig {
  const mirrored: TutorialConfig = {};

  for (const [key, steps] of Object.entries(companyTours)) {
    if (!isMirrored(key)) continue;

    mirrored[key.replace(/^\/dashboard/, "/admin")] = forBackOffice(
      steps,
      !ACROSS_COMPANIES.has(key),
    );
  }

  return {
    ...mirrored,
    // The overview has no selector of its own; Limites de Uso does.
    "/admin": forBackOffice(dashboardTour, false),
    "/admin/charts": forBackOffice(chartsTour, false),
    "/admin/limits": forBackOffice(limitsTour),
    "/admin/system": forBackOffice(systemTour, false),
    // Back-office only: there is no company to select on these.
    "/admin/business": forBackOffice(businessTour, false),
    "/admin/quote": forBackOffice(quoteTour, false),
    "/admin/master-users": forBackOffice(masterUsersTour, false),
  };
}

export { buildAdminTours, MIRRORED_PREFIXES };
