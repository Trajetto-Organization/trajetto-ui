import {
  Activity,
  BadgePercent,
  Bell,
  BookOpen,
  Building2,
  CalendarCheckIcon,
  Coffee,
  CircuitBoardIcon,
  Command,
  Container,
  Crown,
  Fuel,
  Gauge,
  Handshake,
  HeadphonesIcon,
  Kanban,
  Laptop,
  LayoutDashboardIcon,
  LifeBuoy,
  Logs,
  NotepadText,
  Package,
  Plug,
  Radar,
  Receipt,
  Route,
  ShieldUser,
  Split,
  SquareUser,
  Truck,
  TruckElectric,
  User,
  UserPen,
  UserPlus,
  UserX2Icon,
  Wallet,
} from "lucide-react";

import type { UserRole } from "@/app/(protected)/_components/shared/common.types";
import type { ProtectedNavItem } from "../shared/common.types";

const protectedNavIcons = {
  dashboard: LayoutDashboardIcon,
  logo: Command,
  kanban: CircuitBoardIcon,
  employee: UserX2Icon,
  userPen: UserPen,
  user: User,
  master: Crown,
  laptop: Laptop,
  business: Building2,
  split: Split,
  container: Container,
  truck: Truck,
  fuel: Fuel,
  driver: LifeBuoy,
  handShake: Handshake,
  log: Logs,
  Kanban: Kanban,
  headphones: HeadphonesIcon,
  receipt: Receipt,
  fine: NotepadText,
  supply: Gauge,
  check: CalendarCheckIcon,
  package: Package,
  route: Route,
  integration: Plug,
  docs: BookOpen,
  tower: Radar,
  coffee: Coffee,
  activity: Activity,
  bell: Bell,
  badgePercent: BadgePercent,
  shieldUser: ShieldUser,
  squareUser: SquareUser,
  userPlus: UserPlus,
  wallet: Wallet,
  truckElectric: TruckElectric,
};

type NavIconKey = keyof typeof protectedNavIcons;

/**
 * One page, as every navigation surface offers it.
 *
 * `path` is the key: who may see the entry is decided by the route registry
 * (app-routes) through `canAccessPath`, never by flags here.
 */
interface NavEntry {
  path: string;
  /** What the sidebar says, inside its group. */
  title: string;
  /** What ⌘K says, where there is no group around it to give context. */
  paletteName?: string;
  icon: NavIconKey;
  /** ⌘K section. */
  section: string;
  shortcut: [string, string];
  keywords: string;
  /**
   * `false` keeps the page out of the sidebar only. Reached from a card or
   * the palette; still subject to the same verdict everywhere.
   */
  sidebar?: boolean;
  /**
   * Opens outside the app, in a new tab, wherever it is offered: a page that
   * is not part of the panel (the public developer portal) must not take the
   * user out of the one they were working in.
   */
  newTab?: boolean;
}

interface NavGroup {
  title: string;
  icon: NavIconKey;
  items: NavEntry[];
}

type NavNode = NavEntry | NavGroup;

type NavSurface = "admin" | "dashboard" | "driver";

function isGroup(node: NavNode): node is NavGroup {
  return "items" in node;
}

const DASHBOARD_USERS: NavGroup = {
  title: "Usuários",
  icon: "user",
  items: [
    {
      path: "/dashboard/profile-access",
      title: "Perfil de acesso",
      icon: "squareUser",
      section: "usuário",
      shortcut: ["p", "a"],
      keywords: "perfil acesso",
    },
    {
      path: "/dashboard/permission",
      title: "Permissão de usuário",
      paletteName: "Permissão do usuário",
      icon: "shieldUser",
      section: "usuário",
      shortcut: ["p", "d"],
      keywords: "permissão usuário",
    },
    {
      path: "/dashboard/user-registration",
      title: "Cadastro de usuário",
      icon: "userPlus",
      section: "usuário",
      shortcut: ["c", "u"],
      keywords: "cadastro usuário",
    },
  ],
};

/**
 * The sidebar and the command palette, in one list per surface
 * (NAV-DRIFT-1, decision 4.2).
 *
 * They were two hand-written lists and drifted: an employee with Entregas
 * found Torre de Controle and Integrações in ⌘K and not in the sidebar, and
 * ⌘K offered "Atividades recentes" to people the page then bounced. Both
 * surfaces now derive from this and filter with the same `canAccessPath`.
 */
const NAVIGATION: Record<NavSurface, NavNode[]> = {
  admin: [
    {
      path: "/admin",
      title: "Administrativo",
      icon: "laptop",
      section: "admin",
      shortcut: ["d", "d"],
      keywords: "administrativo",
    },
    {
      path: "/admin/kanban",
      title: "Kanban",
      icon: "Kanban",
      section: "navegação",
      shortcut: ["k", "b"],
      keywords: "kanban",
    },
    {
      path: "/admin/fine",
      title: "Multas",
      icon: "fine",
      section: "navegação",
      shortcut: ["m", "t"],
      keywords: "multa",
    },
    {
      path: "/admin/deliveries",
      title: "Entregas",
      icon: "package",
      section: "navegação",
      shortcut: ["e", "n"],
      keywords: "entregas embarcadores ocorrências",
    },
    {
      path: "/admin/routes",
      title: "Rotas",
      icon: "route",
      section: "navegação",
      shortcut: ["r", "t"],
      keywords: "rotas paradas despacho roteiro",
    },
    {
      path: "/admin/control-tower",
      title: "Torre de Controle",
      icon: "tower",
      section: "navegação",
      shortcut: ["t", "c"],
      keywords: "torre controle mapa rastreamento veículos",
    },
    {
      path: "/admin/driver-pauses",
      title: "Pausas dos motoristas",
      icon: "coffee",
      section: "navegação",
      shortcut: ["p", "m"],
      keywords:
        "pausas almoço refeição descanso jornada interjornada lei 13.103 motoristas",
    },
    {
      path: "/admin/integrations",
      title: "Integrações",
      icon: "integration",
      section: "suporte",
      shortcut: ["i", "g"],
      keywords: "integrações api chave webhook",
    },
    {
      // The public developer portal: palette only. The sidebar no longer
      // links it (decision 16.60); the public site's footer does.
      path: "/docs",
      title: "Documentação da API",
      icon: "docs",
      section: "suporte",
      shortcut: ["d", "a"],
      keywords: "documentação api integração referência webhook openapi",
      sidebar: false,
      newTab: true,
    },
    {
      // Opened from the overview's card; the sidebar never listed it.
      path: "/admin/activity",
      title: "Atividades recentes",
      icon: "activity",
      section: "suporte",
      shortcut: ["a", "t"],
      keywords: "atividades histórico auditoria",
      sidebar: false,
    },
    {
      title: "Suporte",
      icon: "headphones",
      items: [
        {
          path: "/admin/quote",
          title: "Orçamentos",
          icon: "receipt",
          section: "suporte",
          shortcut: ["o", "r"],
          keywords: "orçamentos",
        },
      ],
    },
    {
      title: "Empresas",
      icon: "business",
      items: [
        {
          path: "/admin/business",
          title: "Cadastro de empresas",
          paletteName: "Empresas",
          icon: "business",
          section: "empresa",
          shortcut: ["a", "b"],
          keywords: "empresas",
        },
        {
          path: "/admin/branch",
          title: "Cadastro de filiais",
          paletteName: "Filiais",
          icon: "split",
          section: "empresa",
          shortcut: ["b", "a"],
          keywords: "filiais",
        },
      ],
    },
    {
      title: "Usuários",
      icon: "user",
      items: [
        {
          path: "/admin/profile-access",
          title: "Perfil de acesso",
          icon: "squareUser",
          section: "usuário",
          shortcut: ["p", "a"],
          keywords: "perfil acesso",
        },
        {
          path: "/admin/permission",
          title: "Permissão de usuário",
          paletteName: "Permissão do usuário",
          icon: "shieldUser",
          section: "usuário",
          shortcut: ["p", "d"],
          keywords: "permissão usuário",
        },
        {
          path: "/admin/user-registration",
          title: "Cadastro de usuário",
          icon: "userPlus",
          section: "usuário",
          shortcut: ["c", "u"],
          keywords: "cadastro usuário",
        },
        {
          path: "/admin/master-users",
          title: "Usuários masters",
          icon: "master",
          section: "usuário",
          shortcut: ["m", "u"],
          keywords: "usuários masters",
        },
      ],
    },
    {
      title: "Fornecedores",
      icon: "container",
      items: [
        {
          path: "/admin/supplier",
          title: "Cadastro de fornecedor",
          paletteName: "Fornecedores",
          icon: "handShake",
          section: "fornecedor",
          shortcut: ["f", "r"],
          keywords: "fornecedores",
        },
        {
          path: "/admin/part",
          title: "Cadastro de peças",
          paletteName: "Peças",
          icon: "container",
          section: "fornecedor",
          shortcut: ["f", "o"],
          keywords: "peças",
        },
      ],
    },
    {
      title: "Veículos",
      icon: "truck",
      items: [
        {
          path: "/admin/vehicle-type",
          title: "Tipo de veículo",
          icon: "truckElectric",
          section: "veículo",
          shortcut: ["v", "t"],
          keywords: "tipo de veículo",
        },
        {
          path: "/admin/fuel-type",
          title: "Tipo de combustível",
          icon: "fuel",
          section: "veículo",
          shortcut: ["v", "d"],
          keywords: "tipo de combustível",
        },
        {
          path: "/admin/fuel",
          title: "Cadastro de abastecimento",
          paletteName: "Abastecimento",
          icon: "supply",
          section: "veículo",
          shortcut: ["v", "a"],
          keywords: "abastecimento",
        },
        {
          path: "/admin/driver",
          title: "Cadastro de motoristas",
          paletteName: "Motoristas",
          icon: "driver",
          section: "veículo",
          shortcut: ["m", "o"],
          keywords: "motoristas",
        },
        {
          path: "/admin/vehicle",
          title: "Cadastro de veículo",
          paletteName: "Veículos",
          icon: "truck",
          section: "veículo",
          shortcut: ["v", "c"],
          keywords: "veículos",
        },
        {
          path: "/admin/vehicle-checklist",
          title: "Checklist veicular",
          paletteName: "Checklist",
          icon: "check",
          section: "veículo",
          shortcut: ["v", "l"],
          keywords: "checklist",
        },
      ],
    },
    {
      title: "Ordens",
      icon: "log",
      items: [
        {
          path: "/admin/service-order",
          title: "Ordem de serviço",
          icon: "log",
          section: "ordens",
          shortcut: ["o", "s"],
          keywords: "ordem de serviço",
        },
        {
          path: "/admin/service-order-part",
          title: "Ordem por peça",
          paletteName: "Ordem de serviço por peça",
          icon: "badgePercent",
          section: "ordens",
          shortcut: ["o", "p"],
          keywords: "ordem de serviço por peça",
        },
        {
          path: "/admin/account-payable",
          title: "Contas a pagar",
          icon: "wallet",
          section: "ordens",
          shortcut: ["c", "p"],
          keywords: "contas a pagar",
        },
      ],
    },
  ],

  // BUSINESS_ADMIN and BUSINESS_USER share one list: what differs between
  // them is the verdict, not the menu.
  dashboard: [
    {
      path: "/dashboard",
      title: "Dashboard",
      icon: "dashboard",
      section: "navegação",
      shortcut: ["d", "d"],
      keywords: "dashboard",
    },
    {
      path: "/dashboard/kanban",
      title: "Kanban",
      icon: "Kanban",
      section: "navegação",
      shortcut: ["k", "b"],
      keywords: "kanban",
    },
    {
      path: "/dashboard/branch",
      title: "Cadastro de filiais",
      paletteName: "Filiais",
      icon: "split",
      section: "empresa",
      shortcut: ["b", "a"],
      keywords: "filiais",
    },
    {
      path: "/dashboard/fine",
      title: "Multas",
      icon: "fine",
      section: "navegação",
      shortcut: ["m", "t"],
      keywords: "multa",
    },
    {
      path: "/dashboard/deliveries",
      title: "Entregas",
      icon: "package",
      section: "navegação",
      shortcut: ["e", "n"],
      keywords: "entregas embarcadores ocorrências",
    },
    {
      path: "/dashboard/routes",
      title: "Rotas",
      icon: "route",
      section: "navegação",
      shortcut: ["r", "t"],
      keywords: "rotas paradas despacho roteiro",
    },
    {
      path: "/dashboard/control-tower",
      title: "Torre de Controle",
      icon: "tower",
      section: "navegação",
      shortcut: ["t", "c"],
      keywords: "torre controle mapa rastreamento veículos",
    },
    {
      path: "/dashboard/driver-pauses",
      title: "Pausas dos motoristas",
      icon: "coffee",
      section: "navegação",
      shortcut: ["p", "m"],
      keywords:
        "pausas almoço refeição descanso jornada interjornada lei 13.103 motoristas",
    },
    {
      path: "/dashboard/integrations",
      title: "Integrações",
      icon: "integration",
      section: "suporte",
      shortcut: ["i", "g"],
      keywords: "integrações api chave webhook",
    },
    {
      // Palette only, like on admin (decision 16.60).
      path: "/docs",
      title: "Documentação da API",
      icon: "docs",
      section: "suporte",
      shortcut: ["d", "a"],
      keywords: "documentação api integração referência webhook openapi",
      sidebar: false,
      newTab: true,
    },
    {
      // Opened from the dashboard's card; the sidebar never listed it.
      path: "/dashboard/activity",
      title: "Atividades recentes",
      icon: "activity",
      section: "suporte",
      shortcut: ["a", "t"],
      keywords: "atividades histórico auditoria",
      sidebar: false,
    },
    DASHBOARD_USERS,
    {
      title: "Fornecedores",
      icon: "container",
      items: [
        {
          path: "/dashboard/supplier",
          title: "Cadastro de fornecedor",
          paletteName: "Fornecedores",
          icon: "handShake",
          section: "fornecedor",
          shortcut: ["f", "r"],
          keywords: "fornecedores",
        },
        {
          path: "/dashboard/part",
          title: "Cadastro de peças",
          paletteName: "Peças",
          icon: "container",
          section: "fornecedor",
          shortcut: ["f", "o"],
          keywords: "peças",
        },
      ],
    },
    {
      title: "Veículos",
      icon: "truck",
      items: [
        {
          path: "/dashboard/vehicle-type",
          title: "Tipo de veículo",
          icon: "truckElectric",
          section: "veículo",
          shortcut: ["v", "t"],
          keywords: "tipo de veículo",
        },
        {
          path: "/dashboard/fuel-type",
          title: "Tipo de combustível",
          icon: "fuel",
          section: "veículo",
          shortcut: ["v", "d"],
          keywords: "tipo de combustível",
        },
        {
          path: "/dashboard/fuel",
          title: "Cadastro de abastecimento",
          icon: "supply",
          section: "veículo",
          shortcut: ["v", "a"],
          keywords: "abastecimento",
        },
        {
          path: "/dashboard/driver",
          title: "Cadastro de motoristas",
          paletteName: "Motoristas",
          icon: "driver",
          section: "veículo",
          shortcut: ["m", "o"],
          keywords: "motoristas",
        },
        {
          path: "/dashboard/vehicle",
          title: "Cadastro de veículo",
          paletteName: "Veículos",
          icon: "truck",
          section: "veículo",
          shortcut: ["v", "c"],
          keywords: "veículos",
        },
        {
          path: "/dashboard/vehicle-checklist",
          title: "Checklist veicular",
          paletteName: "Checklist",
          icon: "check",
          section: "veículo",
          shortcut: ["v", "l"],
          keywords: "checklist",
        },
      ],
    },
    {
      title: "Ordens",
      icon: "log",
      items: [
        {
          path: "/dashboard/service-order",
          title: "Ordem de serviço",
          icon: "log",
          section: "ordens",
          shortcut: ["o", "s"],
          keywords: "ordem de serviço",
        },
        {
          path: "/dashboard/service-order-part",
          title: "Ordem por peça",
          paletteName: "Ordem de serviço por peça",
          icon: "badgePercent",
          section: "ordens",
          shortcut: ["o", "p"],
          keywords: "ordem de serviço por peça",
        },
        {
          path: "/dashboard/account-payable",
          title: "Contas a pagar",
          icon: "wallet",
          section: "ordens",
          shortcut: ["c", "p"],
          keywords: "contas a pagar",
        },
      ],
    },
  ],

  // Decision 4.8: the driver's own pages, in a sidebar of their own. The
  // registry still decides: Contas a pagar needs FLEET.
  driver: [
    {
      path: "/driver/kanban",
      title: "Kanban",
      icon: "Kanban",
      section: "navegação",
      shortcut: ["k", "b"],
      keywords: "kanban",
    },
    {
      path: "/driver/vehicles",
      title: "Meus veículos",
      icon: "truck",
      section: "motorista",
      shortcut: ["v", "c"],
      keywords: "veículos motorista",
    },
    {
      path: "/driver/account-payable",
      title: "Contas a pagar",
      icon: "wallet",
      section: "ordens",
      shortcut: ["c", "p"],
      keywords: "contas a pagar",
    },
  ],
};

/** Every session's own pages, palette only: the sidebar has its account menu. */
const ACCOUNT_ENTRIES: NavEntry[] = [
  {
    path: "/profile",
    title: "Conta do usuário",
    icon: "user",
    section: "conta",
    shortcut: ["c", "c"],
    keywords: "conta",
    sidebar: false,
  },
  {
    path: "/notifications",
    title: "Notificações",
    icon: "bell",
    section: "conta",
    shortcut: ["n", "t"],
    keywords: "notificações",
    sidebar: false,
  },
];

function navigationSurface(role: UserRole, isDriver: boolean): NavSurface {
  if (role === "MASTER") return "admin";
  return isDriver ? "driver" : "dashboard";
}

/** Everything ⌘K may offer on a surface, before the access verdict. */
function paletteEntries(surface: NavSurface): NavEntry[] {
  const entries = NAVIGATION[surface].flatMap((node) =>
    isGroup(node) ? node.items : [node],
  );

  return [...entries, ...ACCOUNT_ENTRIES];
}

/**
 * The sidebar's tree for a surface, keeping only what `allow` lets through.
 * A group has no page of its own, so it survives only while one child does.
 */
function sidebarItems(
  surface: NavSurface,
  allow: (path: string) => boolean = () => true,
): ProtectedNavItem[] {
  const toItem = (entry: NavEntry): ProtectedNavItem => ({
    title: entry.title,
    url: entry.path,
    icon: entry.icon,
  });

  const visible = (entry: NavEntry) =>
    entry.sidebar !== false && allow(entry.path);

  return NAVIGATION[surface].flatMap<ProtectedNavItem>((node) => {
    if (!isGroup(node)) return visible(node) ? [toItem(node)] : [];

    const items = node.items.filter(visible).map(toItem);

    return items.length > 0
      ? [
          {
            title: node.title,
            url: "#",
            icon: node.icon,
            isActive: true,
            items,
          },
        ]
      : [];
  });
}

export {
  ACCOUNT_ENTRIES,
  NAVIGATION,
  navigationSurface,
  paletteEntries,
  protectedNavIcons,
  sidebarItems,
};
export type {
  NavEntry,
  NavGroup,
  NavIconKey,
  NavNode,
  NavSurface,
  ProtectedNavItem,
};
