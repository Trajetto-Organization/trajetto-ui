import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellRing,
  Building2,
  CarFront,
  ClipboardCheck,
  FileCode2,
  FileDown,
  Fuel,
  Gauge,
  GraduationCap,
  History,
  IdCard,
  Kanban,
  KeyRound,
  LayoutDashboard,
  Link2,
  ListChecks,
  MapPinned,
  MessagesSquare,
  Package,
  PackageSearch,
  QrCode,
  Receipt,
  Route,
  Smartphone,
  Store,
  Tags,
  Truck,
  UserCog,
  Wallet,
  Webhook,
  Wrench,
} from "lucide-react";

import type { PhoneScreen } from "@/components/site/phone-mockup";

import type { FaqItem, ProductPageSeo } from "./json-ld";

/**
 * Copy of the two product pages (/gestao-de-frotas, /gestao-de-entregas),
 * taken from the design (Trajetto Produto.dc.html), which was written from
 * the real product. Every statement maps to a screen or a rule in the code:
 * - no hardware telemetry: positions come from the driver's phone, at the
 *   moment of a record, and the tower shows the driver only while a route is
 *   running and the app is open (decision 7.3);
 * - no route optimisation: the dispatcher sets the stop order;
 * - the PDF is ICP-Brasil signed only when the certificate is installed.
 * Tests (product-pages, public-landing, legal-facts) read this file.
 */

type ProductModule = "frotas" | "entregas";

interface ProductFlowStep {
  icon: LucideIcon;
  title: string;
  description: string;
  points: readonly string[];
}

interface ProductFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

type StatusTone = "green" | "sky" | "violet" | "red" | "slate";

interface ProductContent {
  module: ProductModule;
  /** Page metadata: path, short title, social title, description, keywords. */
  page: {
    path: string;
    title: string;
    socialTitle: string;
    description: string;
    keywords: readonly string[];
  };
  name: string;
  icon: LucideIcon;
  /** Hero title: the accent word (titleB) is drawn in the module color. */
  titleA: string;
  titleB: string;
  description: string;
  highlights: readonly string[];
  card: {
    title: string;
    kpis: readonly { label: string; value: number; dot: string }[];
    headers: { a: string; b: string; c: string; d: string };
    rows: readonly {
      a: string;
      b: string;
      c: string;
      d: string;
      status: string;
      tone: StatusTone;
    }[];
  };
  phone: PhoneScreen;
  chipA: { icon: LucideIcon; title: string; sub: string };
  chipB: { icon: LucideIcon; title: string; sub: string };
  flowTitle: string;
  flowDescription: string;
  flow: readonly ProductFlowStep[];
  featuresTitle: string;
  features: readonly ProductFeature[];
  appTitle: string;
  appDescription: string;
  app: readonly { screen: PhoneScreen; title: string; description: string }[];
  faq: readonly FaqItem[];
  other: {
    module: ProductModule;
    icon: LucideIcon;
    name: string;
    href: string;
    title: string;
    description: string;
  };
  ctaTitle: string;
  ctaDescription: string;
  seo: ProductPageSeo;
}

/* ------------------------------------------------------------------ */
/* Gestão de Frotas                                                    */
/* ------------------------------------------------------------------ */

const FLEET_PAGE = {
  path: "/gestao-de-frotas",
  name: "Gestão de Frotas",
  title: "Gestão de frotas",
  socialTitle: "Gestão de frotas com app para o motorista | Trajetto",
  description:
    "Controle veículos, motoristas, abastecimentos, checklists, manutenção, multas e contas a pagar. App Android para o motorista e leitura do odômetro por IA.",
  keywords: [
    "gestão de frotas",
    "controle de abastecimento",
    "checklist veicular",
    "manutenção de frota",
    "controle de multas",
    "ordens de serviço",
    "app para motorista",
  ],
} as const;

const FLEET_FLOW: readonly ProductFlowStep[] = [
  {
    icon: CarFront,
    title: "A frota é cadastrada",
    description:
      "Veículos, tipos de veículo, motoristas e filiais, com os dados que a operação e a fiscalização pedem.",
    points: [
      "Placa e RENAVAM únicos na empresa",
      "CNH com categoria e validade",
      "Veículos e motoristas por filial",
      "Status do veículo: ativo, inativo ou bloqueado",
    ],
  },
  {
    icon: Smartphone,
    title: "O motorista registra no app",
    description:
      "Abastecimento e checklist saem do celular, com foto tirada na hora, e chegam ao painel sem digitação dupla.",
    points: [
      "Foto do odômetro, litros e preço por litro",
      "Checklist item a item, com fotos",
      "Posição capturada no envio do abastecimento",
      "Funciona sem sinal e envia depois",
    ],
  },
  {
    icon: Wrench,
    title: "Manutenção e custos no lugar certo",
    description:
      "Ordens de serviço com peças e fornecedores, multas e contas a pagar ligadas aos veículos que as geraram.",
    points: [
      "Ordens de serviço com as peças usadas",
      "Fornecedores e catálogo de peças",
      "Multas por veículo e motorista",
      "Contas a pagar com vencimento",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "A gestão acompanha",
    description:
      "Painel com os números da frota, registro de atividades de quem fez o quê e exportação para as suas planilhas.",
    points: [
      "Painel com indicadores da frota",
      "Registro de atividades",
      "Exportação em CSV e Excel",
      "Avisos no sino, por e-mail e WhatsApp",
    ],
  },
];

const FLEET_FEATURES: readonly ProductFeature[] = [
  {
    icon: CarFront,
    title: "Veículos e tipos",
    description:
      "Cadastro completo do veículo, com o status de em rota atualizado pela própria operação de entregas.",
  },
  {
    icon: IdCard,
    title: "Motoristas",
    description:
      "Dados do motorista com a CNH, a categoria e a validade, e o vínculo com a filial.",
  },
  {
    icon: Building2,
    title: "Filiais",
    description:
      "Várias filiais na mesma conta, com veículos e motoristas de cada uma.",
  },
  {
    icon: Fuel,
    title: "Abastecimentos",
    description:
      "Litros, preço, quilometragem e foto do odômetro, com a leitura da IA comparada ao valor digitado.",
  },
  {
    icon: ClipboardCheck,
    title: "Checklist veicular",
    description:
      "Inspeção feita no app com foto em cada item e análise das imagens no servidor.",
  },
  {
    icon: Wrench,
    title: "Ordens de serviço",
    description:
      "Manutenções com as peças usadas, a quantidade e o preço de cada uma.",
  },
  {
    icon: Package,
    title: "Peças e fornecedores",
    description:
      "Catálogo de peças e fornecedores para usar nas ordens de serviço e nas contas.",
  },
  {
    icon: Receipt,
    title: "Multas",
    description:
      "Infrações registradas e vinculadas ao veículo e ao motorista responsável.",
  },
  {
    icon: Wallet,
    title: "Contas a pagar",
    description:
      "Despesas da operação com vencimento, fornecedor e o veículo a que se referem.",
  },
  {
    icon: Kanban,
    title: "Kanban",
    description:
      "As tarefas da equipe em colunas, da revisão agendada à troca de peça.",
  },
  {
    icon: UserCog,
    title: "Perfis de acesso",
    description:
      "Cada usuário vê e altera só as telas que o perfil permite, com verificação em duas etapas no login.",
  },
  {
    icon: History,
    title: "Registro de atividades",
    description: "Quem criou, alterou ou removeu cada registro, e quando.",
  },
  {
    icon: Bell,
    title: "Notificações",
    description:
      "Avisos no sino do painel, por e-mail e, para quem ativar, por WhatsApp.",
  },
  {
    icon: FileDown,
    title: "Exportação",
    description: "Listagens exportadas em CSV ou Excel com um clique.",
  },
  {
    icon: GraduationCap,
    title: "Tutoriais",
    description:
      "Um guia passo a passo nas telas do painel, para a equipe aprender usando.",
  },
];

const FLEET_FAQ: readonly FaqItem[] = [
  {
    question:
      "O motorista precisa de internet para registrar abastecimento ou checklist?",
    answer:
      "Não. O registro e as fotos ficam salvos no aparelho e são enviados quando o sinal volta, sem criar lançamentos duplicados.",
  },
  {
    question: "Como a IA ajuda no controle de abastecimento?",
    answer:
      "A IA lê a quilometragem na foto do odômetro e compara com o valor digitado pelo motorista. Quando os dois não batem, o abastecimento fica sinalizado para conferência.",
  },
  {
    question: "Posso organizar a frota por filial?",
    answer:
      "Sim. Veículos e motoristas podem ser ligados a filiais, e os perfis de acesso definem o que cada usuário vê e altera.",
  },
  {
    question: "O Trajetto rastreia os veículos por GPS?",
    answer:
      "O Trajetto não usa rastreador instalado no veículo. A posição vem do app do motorista: é gravada no envio do abastecimento e, no módulo de entregas, junto dos registros da rota; a torre de controle mostra o motorista enquanto a rota está em andamento e o app está aberto.",
  },
  {
    question: "Consigo tirar os dados do sistema?",
    answer: "Sim. As listagens exportam em CSV e Excel, com um clique.",
  },
];

/* ------------------------------------------------------------------ */
/* Gestão de Entregas                                                  */
/* ------------------------------------------------------------------ */

const DELIVERY_PAGE = {
  path: "/gestao-de-entregas",
  name: "Gestão de Entregas",
  title: "Gestão de entregas",
  socialTitle: "Gestão de entregas com comprovante digital | Trajetto",
  description:
    "Importe NF-e, monte rotas, acompanhe as paradas na torre de controle e receba o comprovante com foto, assinatura e GPS. App offline e API para integrar.",
  keywords: [
    "gestão de entregas",
    "comprovante de entrega digital",
    "canhoto digital",
    "torre de controle",
    "rotas de entrega",
    "importação de NF-e XML",
    "app do motorista",
    "rastreamento de entregas",
  ],
} as const;

const DELIVERY_FLOW: readonly ProductFlowStep[] = [
  {
    icon: FileCode2,
    title: "Os pedidos entram",
    description:
      "Cadastre à mão, importe o XML da NF-e ou suba a planilha modelo. Cada entrega fica ligada ao seu embarcador.",
    points: [
      "NF-e em XML, sem duplicar pela chave de acesso",
      "Planilha modelo com relatório por linha",
      "Estorno de uma importação feita por engano, de XML ou de planilha",
      "Vários embarcadores na mesma conta",
    ],
  },
  {
    icon: Route,
    title: "A rota é montada",
    description:
      "O despachante escolhe as entregas, o motorista, o veículo e a ordem das paradas, e libera a rota para o app.",
    points: [
      "Planejada, liberada, em andamento e concluída",
      "Ordem das paradas definida pelo despachante",
      "Saída e retorno previstos",
      "Motorista e veículo da própria frota",
    ],
  },
  {
    icon: Smartphone,
    title: "O motorista executa no app",
    description:
      "Inicia a rota, marca a chegada e comprova a entrega. Se algo impede a entrega, registra a ocorrência com foto.",
    points: [
      "Foto do canhoto e assinatura na tela",
      "Nome de quem recebeu e localização",
      "Ocorrências com tipo, foto e descrição",
      "Registros guardados quando falta sinal",
    ],
  },
  {
    icon: MapPinned,
    title: "A base acompanha",
    description:
      "A torre de controle mostra as rotas em andamento, e o painel do dia separa o que está sem rota, em rota, entregue e com insucesso.",
    points: [
      "Posição do motorista em rota, com o app aberto",
      "Operação de hoje por status",
      "Quadro de progresso por motorista",
      "Chat com o motorista, com áudio",
    ],
  },
  {
    icon: QrCode,
    title: "O comprovante fecha o ciclo",
    description:
      "Cada entrega concluída gera um PDF com os dados do registro, a impressão digital do arquivo e um QR de conferência pública.",
    points: [
      "PDF com SHA-256 e QR de verificação",
      "Auditoria de comprovantes pela equipe",
      "Sugestão da IA sobre a foto do canhoto",
      "Histórico completo da entrega",
    ],
  },
  {
    icon: BellRing,
    title: "O cliente fica sabendo",
    description:
      "O destinatário recebe um link para acompanhar a entrega, com as mensagens que a sua empresa escreveu.",
    points: [
      "Link de acompanhamento por e-mail e WhatsApp",
      "Modelos de mensagem por momento da entrega",
      "Opção de parar de receber avisos",
      "Webhooks para o seu sistema a cada mudança",
    ],
  },
];

const DELIVERY_FEATURES: readonly ProductFeature[] = [
  {
    icon: Store,
    title: "Embarcadores",
    description:
      "Cadastre os embarcadores que você atende e filtre as entregas de cada um.",
  },
  {
    icon: PackageSearch,
    title: "Importações rastreáveis",
    description:
      "Cada importação, de XML ou de planilha, fica registrada com o resultado de cada arquivo ou linha e pode ser estornada.",
  },
  {
    icon: Tags,
    title: "Ocorrências do seu jeito",
    description:
      "Defina os tipos de ocorrência e os motivos de mudança de status que fazem sentido para a sua operação.",
  },
  {
    icon: ListChecks,
    title: "Auditoria de comprovantes",
    description:
      "Uma fila para a equipe conferir as fotos dos canhotos, com a leitura da IA ao lado como sugestão.",
  },
  {
    icon: MessagesSquare,
    title: "Chat com o motorista",
    description:
      "Texto, fotos e áudio entre a base e o motorista, sem depender de aplicativo de terceiros.",
  },
  {
    icon: Link2,
    title: "Mensagens ao cliente",
    description:
      "Modelos de e-mail e WhatsApp para cada momento da entrega, com o link de acompanhamento.",
  },
  {
    icon: KeyRound,
    title: "API com escopos",
    description:
      "Chaves de API com escopos de leitura para rotas, entregas e eventos, e limite de chamadas por minuto.",
  },
  {
    icon: Webhook,
    title: "Webhooks assinados",
    description:
      "Seu sistema recebe cada evento com assinatura para conferir a origem, e o monitor mostra cada envio.",
  },
  {
    icon: FileDown,
    title: "Exportação",
    description:
      "Entregas e ocorrências exportadas em CSV ou Excel para o seu relatório ou para o embarcador.",
  },
];

const DELIVERY_FAQ: readonly FaqItem[] = [
  {
    question: "O Trajetto calcula a melhor rota automaticamente?",
    answer:
      "Não. A ordem das paradas é definida pelo despachante na montagem da rota, e o Trajetto registra e acompanha essa ordem até a última entrega.",
  },
  {
    question: "O motorista precisa de internet o tempo todo?",
    answer:
      "Não. Comprovantes, ocorrências e fotos ficam salvos no aparelho e são enviados quando o sinal volta, sem criar registros duplicados. O app mantém os dados da rota guardados por até 7 dias.",
  },
  {
    question: "Como alguém confere se um comprovante é verdadeiro?",
    answer:
      "Cada PDF traz um QR e um link de verificação pública, que confere a impressão digital SHA-256 do arquivo. Com o certificado instalado, o PDF sai assinado com o certificado ICP-Brasil da Trajetto, conferível no validador do ITI; sem ele, o próprio documento diz que não tem assinatura digital.",
  },
  {
    question: "A torre de controle mostra onde o motorista está?",
    answer:
      "Sim, enquanto a rota está em andamento e o app do motorista está aberto: a posição enviada pelo app aparece no mapa. Fora de uma rota em andamento o app não acompanha a posição: ela só é gravada junto de um registro, como o comprovante, a ocorrência ou o abastecimento.",
  },
  {
    question: "Consigo integrar com o meu ERP ou com o embarcador?",
    answer:
      "Sim. A API pública lê rotas, entregas e eventos com chaves por escopo, e os webhooks assinados avisam o seu sistema a cada mudança de status.",
  },
];

/* ------------------------------------------------------------------ */

const PRODUCTS: Record<ProductModule, ProductContent> = {
  frotas: {
    module: "frotas",
    page: FLEET_PAGE,
    name: FLEET_PAGE.name,
    icon: Truck,
    titleA: "Gestão de frotas do escritório ao ",
    titleB: "motorista",
    description:
      "Cadastre a frota, receba abastecimentos e checklists com foto direto do celular do motorista e acompanhe manutenção, multas e custos em um só painel.",
    highlights: [
      "Abastecimento com foto do odômetro",
      "Checklist com foto em cada item",
      "Manutenção, multas e custos juntos",
    ],
    card: {
      title: "Veículos · Matriz",
      kpis: [
        { label: "Veículos", value: 127, dot: "#8b5cf6" },
        { label: "Motoristas", value: 94, dot: "#0ea5e9" },
        { label: "Ordens de serviço abertas", value: 5, dot: "#f59e0b" },
      ],
      headers: { a: "Placa", b: "Veículo", c: "Motorista", d: "Km" },
      rows: [
        {
          a: "RTA1B23",
          b: "Volvo FH 540",
          c: "Carlos Souza",
          d: "187.450",
          status: "Em rota",
          tone: "sky",
        },
        {
          a: "QWE4R56",
          b: "Scania R 450",
          c: "Ana Ribeiro",
          d: "142.118",
          status: "Ativo",
          tone: "green",
        },
        {
          a: "JKL7M89",
          b: "Mercedes Atego 2426",
          c: "João Lima",
          d: "98.302",
          status: "Ativo",
          tone: "green",
        },
        {
          a: "BRT2C34",
          b: "VW Delivery 11.180",
          c: "Sem motorista",
          d: "64.920",
          status: "Bloqueado",
          tone: "red",
        },
      ],
    },
    phone: "fuel",
    chipA: {
      icon: Wrench,
      title: "Ordem de serviço aberta",
      sub: "Troca de pastilhas · RTA1B23",
    },
    chipB: {
      icon: Gauge,
      title: "Leitura do odômetro",
      sub: "A IA confere com o digitado",
    },
    flowTitle: "Da garagem ao relatório, passo a passo.",
    flowDescription:
      "Quatro etapas que tiram a frota da planilha e do grupo de mensagens.",
    flow: FLEET_FLOW,
    featuresTitle: "Tudo o que a gestão da frota precisa.",
    features: FLEET_FEATURES,
    appTitle: "Abastecimento e checklist direto do celular.",
    appDescription:
      "O motorista escolhe o veículo, fotografa e envia. Sem sinal, o registro espera no aparelho.",
    app: [
      {
        screen: "fuel",
        title: "Abastecimento",
        description:
          "Foto do odômetro, litros e preço por litro; a posição é capturada no envio.",
      },
      {
        screen: "checklist",
        title: "Checklist",
        description:
          "Inspeção item a item, com foto em cada um, direto do celular.",
      },
      {
        screen: "offline",
        title: "Fila sem sinal",
        description:
          "Sem conexão, o registro e as fotos ficam no aparelho e são enviados quando o sinal volta, sem duplicar.",
      },
    ],
    faq: FLEET_FAQ,
    other: {
      module: "entregas",
      icon: Package,
      name: "Gestão de Entregas",
      href: DELIVERY_PAGE.path,
      title: "Também faz entregas?",
      description:
        "O módulo de entregas usa os mesmos motoristas, veículos e app.",
    },
    ctaTitle: "Coloque a sua frota no Trajetto.",
    ctaDescription:
      "Conte quantos veículos e motoristas você tem e montamos a proposta.",
    seo: {
      path: FLEET_PAGE.path,
      name: FLEET_PAGE.name,
      description: FLEET_PAGE.description,
      category: "Gestão de frotas",
      features: FLEET_FEATURES.map((feature) => feature.title),
      faq: FLEET_FAQ,
    },
  },
  entregas: {
    module: "entregas",
    page: DELIVERY_PAGE,
    name: DELIVERY_PAGE.name,
    icon: Package,
    titleA: "Gestão de entregas do pedido ao ",
    titleB: "comprovante",
    description:
      "Importe as notas, monte as rotas e acompanhe cada parada. O motorista registra a entrega no app, com foto do canhoto e assinatura, mesmo sem sinal.",
    highlights: [
      "Comprovante com foto, assinatura e GPS",
      "App que funciona sem sinal",
      "API e webhooks para integrar",
    ],
    card: {
      title: "Torre de controle · Hoje",
      kpis: [
        { label: "Em rota", value: 18, dot: "#0ea5e9" },
        { label: "Entregues hoje", value: 46, dot: "#10b981" },
        { label: "Insucessos hoje", value: 2, dot: "#ef4444" },
      ],
      headers: { a: "Pedido", b: "Destinatário", c: "Rota", d: "Parada" },
      rows: [
        {
          a: "48213",
          b: "Mercado Bom Preço",
          c: "Rota 12 · Carlos Souza",
          d: "1 de 3",
          status: "Entregue",
          tone: "green",
        },
        {
          a: "48214",
          b: "Farmácia Vida",
          c: "Rota 12 · Carlos Souza",
          d: "2 de 3",
          status: "Em rota",
          tone: "sky",
        },
        {
          a: "48215",
          b: "Padaria Central",
          c: "Rota 12 · Carlos Souza",
          d: "3 de 3",
          status: "Designada",
          tone: "violet",
        },
        {
          a: "48230",
          b: "Loja Ponto Certo",
          c: "Aguardando rota",
          d: "—",
          status: "Sem rota",
          tone: "slate",
        },
      ],
    },
    phone: "proof",
    chipA: {
      icon: FileCode2,
      title: "NF-e importada",
      sub: "Sem duplicar pela chave de acesso",
    },
    chipB: {
      icon: QrCode,
      title: "Comprovante em PDF",
      sub: "SHA-256 e QR de conferência",
    },
    flowTitle: "Do pedido ao cliente avisado, passo a passo.",
    flowDescription:
      "Seis etapas que acompanham a entrega da entrada da nota até o comprovante conferido.",
    flow: DELIVERY_FLOW,
    featuresTitle: "Tudo o que a operação de entregas precisa.",
    features: DELIVERY_FEATURES,
    appTitle: "A rota inteira no bolso do motorista.",
    appDescription:
      "Inicia a rota, marca a chegada e comprova a entrega. Sem sinal, os registros esperam no aparelho.",
    app: [
      {
        screen: "deliveries",
        title: "Entregas do dia",
        description:
          "As paradas na ordem definida pelo despachante, com o status de cada uma.",
      },
      {
        screen: "proof",
        title: "Comprovante",
        description:
          "Foto do canhoto, assinatura na tela, quem recebeu e a localização do registro.",
      },
      {
        screen: "offline",
        title: "Fila sem sinal",
        description:
          "Sem conexão, o registro fica no aparelho e é enviado quando o sinal volta, sem duplicar.",
      },
    ],
    faq: DELIVERY_FAQ,
    other: {
      module: "frotas",
      icon: Truck,
      name: "Gestão de Frotas",
      href: FLEET_PAGE.path,
      title: "Também cuida da frota?",
      description:
        "O módulo de frotas usa os mesmos motoristas, veículos e app.",
    },
    ctaTitle: "Coloque as suas entregas no Trajetto.",
    ctaDescription:
      "Conte como é a sua operação de entregas e montamos a proposta.",
    seo: {
      path: DELIVERY_PAGE.path,
      name: DELIVERY_PAGE.name,
      description: DELIVERY_PAGE.description,
      category: "Gestão de entregas",
      features: [
        ...DELIVERY_FLOW.map((step) => step.title),
        ...DELIVERY_FEATURES.map((feature) => feature.title),
      ],
      faq: DELIVERY_FAQ,
    },
  },
};

export {
  DELIVERY_FAQ,
  DELIVERY_FEATURES,
  DELIVERY_FLOW,
  DELIVERY_PAGE,
  FLEET_FAQ,
  FLEET_FEATURES,
  FLEET_FLOW,
  FLEET_PAGE,
  PRODUCTS,
};
export type {
  ProductContent,
  ProductFeature,
  ProductFlowStep,
  ProductModule,
  StatusTone,
};
