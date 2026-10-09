import type { TutorialConfig, TutorialStep } from "../tutorial-provider.types";

import { revalidateStep, welcomeStep } from "./factories";

/** Minha Conta and Notificações, shared by every role (drivers included). */

const profileTour: TutorialStep[] = [
  welcomeStep(
    "Minha Conta 👤",
    "Os seus dados de acesso e como você quer ser avisado. O que muda aqui vale só para você.",
  ),
  {
    anchor: "profile-tabs",
    title: "Configurações e Notificações 📑",
    content: `• Configurações: foto, nome, senha e verificação em duas etapas
    • Notificações: o que chega por aqui, por push e por WhatsApp, e o som dos alertas da operação`,
    placement: "bottom",
  },
  {
    anchor: "profile-account",
    title: "Seus Dados 🔐",
    content: `Troque a foto, o nome e a senha, e ative a verificação em duas etapas (2FA) para proteger a conta.
    NOTA: Editar o nome ou o telefone não encerra as suas sessões.`,
    placement: "top",
  },
];

const notificationsTour: TutorialStep[] = [
  welcomeStep(
    "Notificações 🔔",
    "Os avisos que a plataforma enviou para você: ocorrências, autorizações, prazos e mudanças de acesso.",
  ),
  {
    anchor: "notifications-realtime",
    title: "Tempo Real ⚡",
    content:
      "Liga ou desliga as notificações do navegador, para ser avisado mesmo com a aba em segundo plano.",
    placement: "bottom",
    optional: true,
  },
  {
    anchor: "notifications-mark-all",
    title: "Marcar Todas como Lidas ✅",
    content:
      "Zera o contador de não lidas de uma vez. Fica desabilitado quando não há nada por ler.",
    placement: "bottom",
  },
  revalidateStep("Atualizar"),
  {
    anchor: "notifications-tabs",
    title: "Todas ou Não Lidas 📑",
    content:
      "Alterne entre o histórico completo e só o que ainda não foi lido. Role até o fim para carregar mais.",
    placement: "bottom",
  },
];

const accountTours: TutorialConfig = {
  "/profile": profileTour,
  "/notifications": notificationsTour,
};

export { accountTours };
