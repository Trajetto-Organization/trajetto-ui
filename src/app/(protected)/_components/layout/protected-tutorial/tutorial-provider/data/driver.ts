import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import { welcomeStep } from "./factories";
import { kanbanTour } from "./operations";

/**
 * The driver's web pages (decision 9.2: minimal). The day-to-day of a driver
 * is the app; these tours only say what each page is for.
 */

const sidebarStep = (): TutorialStep => ({
  anchor: "sidebar-menu",
  title: "Suas Páginas 📍",
  content:
    "O menu mostra só as suas páginas: Kanban, Meus veículos e Contas a pagar (esta quando a empresa tem o módulo Frotas).",
  placement: "right",
  mobile: { openSidebar: true },
});

const driverTours: TutorialConfig = {
  "/driver/vehicles": [
    welcomeStep(
      "Meus Veículos 🚚",
      "Os veículos que você dirige: os de que é responsável e os das suas rotas liberadas ou em andamento.",
    ),
    sidebarStep(),
    {
      anchor: "driver-vehicles",
      title: "Seus Veículos 🔍",
      content: `Busque por placa, descrição, marca ou modelo. Toque num veículo ativo para ver os abastecimentos ou as ordens de serviço dele.
      NOTA: Veículos inativos ou bloqueados aparecem esmaecidos e não abrem.`,
      placement: "top",
    },
  ],
  "/driver/vehicles/:vehicleId/fuels": [
    welcomeStep(
      "Abastecimentos do Veículo ⛽",
      "O histórico de abastecimentos deste veículo.",
    ),
    {
      anchor: "driver-fuels",
      title: "Histórico ⛽",
      content:
        "Busque um abastecimento e veja litros, preço por litro, KM, filial e fornecedor. Novos abastecimentos são registrados pelo aplicativo.",
      placement: "top",
    },
  ],
  "/driver/vehicles/:vehicleId/service-orders": [
    welcomeStep(
      "Ordens de Serviço do Veículo 🛠️",
      "As manutenções deste veículo e a situação de cada uma.",
    ),
    {
      anchor: "driver-service-orders",
      title: "Manutenções 🛠️",
      content:
        "Busque uma ordem de serviço e veja se a manutenção é interna ou externa e se está Em Andamento ou Concluída.",
      placement: "top",
    },
  ],
  "/driver/account-payable": [
    welcomeStep(
      "Contas a Pagar 💰",
      "As contas em que você é o responsável, com valor, vencimento e situação.",
    ),
    {
      anchor: "driver-payables-search",
      title: "Buscar Contas 🔍",
      content: "Procure por favorecido, descrição, documento ou placa.",
      placement: "bottom",
    },
    {
      anchor: "revalidate",
      title: "Atualizar 🔄",
      content: "Busca as contas de novo, sem recarregar a página.",
      placement: "bottom",
    },
  ],
  "/driver/kanban": kanbanTour,
};

export { driverTours };
