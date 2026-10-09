import type { PhoneScreen } from "@/components/site/phone-mockup";

/**
 * Copy of the driver app page (design: Trajetto App), written from the real
 * product. Kept apart from the markup so the JSON-LD and the tests read the
 * same strings the page shows.
 */

/** Which operation an item belongs to: d = Entregas, f = Frotas, x = both. */
type Module = "d" | "f" | "x";

interface StoryStep {
  screen: PhoneScreen;
  module: Module;
  moduleLabel: string;
  title: string;
  description: string;
  points: readonly string[];
}

const STORY: readonly StoryStep[] = [
  {
    screen: "deliveries",
    module: "d",
    moduleLabel: "Entregas",
    title: "A rota do dia, na ordem certa.",
    description:
      "As paradas aparecem na ordem definida pelo despachante, com o status de cada uma e o progresso da rota.",
    points: [
      "Iniciar a rota e marcar a chegada",
      "Status de cada parada",
      "Endereço e número do pedido",
    ],
  },
  {
    screen: "proof",
    module: "d",
    moduleLabel: "Entregas",
    title: "O comprovante na hora da entrega.",
    description:
      "Foto do canhoto, assinatura na tela, nome de quem recebeu e a localização do registro. Se algo impede a entrega, o motorista registra a ocorrência com foto.",
    points: [
      "Foto do canhoto e assinatura na tela",
      "Nome de quem recebeu e localização",
      "Ocorrências com tipo, foto e descrição",
    ],
  },
  {
    screen: "offline",
    module: "x",
    moduleLabel: "Frotas e Entregas",
    title: "Sem sinal, nada se perde.",
    description:
      "O registro fica no aparelho e é enviado quando o sinal volta, sem duplicar.",
    points: [
      "Fila de envios pendentes",
      "O envio continua de onde parou",
      "Dados da rota guardados por até 7 dias",
    ],
  },
  {
    screen: "fuel",
    module: "f",
    moduleLabel: "Frotas",
    title: "Abastecimento sem papel.",
    description:
      "Foto do odômetro, litros e preço por litro. A posição é capturada no envio e a IA confere a quilometragem.",
    points: [
      "Foto do odômetro tirada na hora",
      "Total calculado automaticamente",
      "Posição capturada no envio",
    ],
  },
  {
    screen: "checklist",
    module: "f",
    moduleLabel: "Frotas",
    title: "Checklist item a item, com foto.",
    description:
      "A inspeção do veículo feita direto do celular, com foto em cada item e análise das imagens no servidor.",
    points: [
      "Foto em cada item",
      "Observações do motorista",
      "Resultado direto no painel",
    ],
  },
];

type QueueIcon = "proof" | "fuel" | "incident";

interface QueueItem {
  icon: QueueIcon;
  module: Module;
  title: string;
  meta: string;
}

const OFFLINE_QUEUE: readonly QueueItem[] = [
  {
    icon: "proof",
    module: "d",
    title: "Comprovante · Farmácia Vida",
    meta: "Foto do canhoto e assinatura",
  },
  {
    icon: "fuel",
    module: "f",
    title: "Abastecimento · RTA1B23",
    meta: "Foto do odômetro · 180,5 L",
  },
  {
    icon: "incident",
    module: "d",
    title: "Ocorrência · Padaria Central",
    meta: "Destinatário ausente, com foto",
  },
];

type FeatureIcon =
  | "route"
  | "proof"
  | "incident"
  | "chat"
  | "fuel"
  | "checklist"
  | "offline"
  | "location";

interface Feature {
  icon: FeatureIcon;
  title: string;
  description: string;
  module: Module;
}

const FEATURES: readonly Feature[] = [
  {
    icon: "route",
    title: "Rota do dia",
    description:
      "As paradas na ordem definida pelo despachante, com o status de cada uma.",
    module: "d",
  },
  {
    icon: "proof",
    title: "Comprovante de entrega",
    description: "Foto do canhoto, assinatura na tela e nome de quem recebeu.",
    module: "d",
  },
  {
    icon: "incident",
    title: "Ocorrências",
    description: "Quando algo impede a entrega: tipo, foto e descrição.",
    module: "d",
  },
  {
    icon: "chat",
    title: "Chat com a base",
    description:
      "Texto, fotos e áudio, sem depender de aplicativo de terceiros.",
    module: "d",
  },
  {
    icon: "fuel",
    title: "Abastecimento",
    description:
      "Foto do odômetro, litros e preço por litro, com a leitura da IA.",
    module: "f",
  },
  {
    icon: "checklist",
    title: "Checklist veicular",
    description: "Inspeção item a item, com foto em cada um.",
    module: "f",
  },
  {
    icon: "offline",
    title: "Funciona sem sinal",
    description:
      "Os registros esperam no aparelho e são enviados quando o sinal volta.",
    module: "x",
  },
  {
    icon: "location",
    title: "Localização no registro",
    description:
      "A posição é gravada junto do comprovante, da ocorrência ou do abastecimento.",
    module: "x",
  },
];

interface FaqEntry {
  question: string;
  answer: string;
}

const APP_FAQ: readonly FaqEntry[] = [
  {
    question: "O motorista precisa de internet o tempo todo?",
    answer:
      "Não. Comprovantes, ocorrências, abastecimentos e fotos ficam salvos no aparelho e são enviados quando o sinal volta, sem criar registros duplicados. O app mantém os dados da rota guardados por até 7 dias.",
  },
  {
    question: "O app acompanha a posição do motorista o tempo todo?",
    answer:
      "Não. A posição é gravada junto de um registro, como o comprovante, a ocorrência ou o abastecimento. A torre de controle mostra o motorista enquanto a rota está em andamento e o app está aberto.",
  },
  {
    question: "É um app para frotas e outro para entregas?",
    answer:
      "Não. É um único aplicativo Android para as duas operações; o motorista vê as telas dos módulos que a empresa contratou.",
  },
  {
    question: "Preciso de rastreador instalado no veículo?",
    answer:
      "Não. O Trajetto não usa rastreador instalado no veículo: a posição vem do app do motorista.",
  },
];

/*
 * Module colors as the design maps them: Entregas pink, Frotas violet,
 * both = ink on the neutral soft fill. Literal class names so Tailwind
 * keeps them.
 */
const MODULE_TEXT: Record<Module, string> = {
  // Darker pink in light: #d81b60 on its soft tint is 4.0:1 for the small chips (AA 4.5).
  d: "text-[#c2185b] dark:text-site-pink",
  f: "text-site-violet",
  x: "text-site-ink",
};

const MODULE_BG: Record<Module, string> = {
  d: "bg-site-pink",
  f: "bg-site-violet",
  x: "bg-site-ink",
};

const MODULE_SOFT_BG: Record<Module, string> = {
  d: "bg-site-pink-soft",
  f: "bg-site-violet-soft",
  x: "bg-site-soft2",
};

/** The soft color as a CSS value, for gradients. */
const MODULE_SOFT_VAR: Record<Module, string> = {
  d: "var(--site-pink-soft)",
  f: "var(--site-violet-soft)",
  x: "rgb(var(--site-soft2))",
};

export {
  APP_FAQ,
  FEATURES,
  MODULE_BG,
  MODULE_SOFT_BG,
  MODULE_SOFT_VAR,
  MODULE_TEXT,
  OFFLINE_QUEUE,
  STORY,
};
export type {
  FaqEntry,
  Feature,
  FeatureIcon,
  Module,
  QueueIcon,
  QueueItem,
  StoryStep,
};
