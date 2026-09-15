import {
  Building2,
  CalendarCheckIcon,
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
  Receipt,
  Route,
  Split,
  Truck,
  User,
  UserPen,
  UserX2Icon,
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
};

const protectedNavItemsByRole: Record<UserRole, ProtectedNavItem[]> = {
  MASTER: [
    {
      title: "Administrativo",
      url: "/admin",
      icon: "laptop",
      isActive: true,
      items: [],
    },
    {
      title: "Kanban",
      url: "/admin/kanban",
      icon: "Kanban",
    },
    {
      title: "Multas",
      url: "/admin/fine",
      icon: "fine",
    },
    {
      title: "Entregas",
      url: "/admin/deliveries",
      icon: "package",
    },
    {
      title: "Rotas",
      url: "/admin/routes",
      icon: "route",
    },
    {
      title: "Suporte",
      url: "#",
      icon: "headphones",
      isActive: true,
      items: [
        {
          title: "Orçamentos",
          url: "/admin/quote",
          icon: "receipt",
        },
      ],
    },
    {
      title: "Empresas",
      url: "#",
      icon: "business",
      isActive: true,
      items: [
        {
          title: "Cadastro de empresas",
          url: "/admin/business",
          icon: "business",
        },
        {
          title: "Cadastro de filiais",
          url: "/admin/branch",
          icon: "split",
        },
      ],
    },
    {
      title: "Usuários",
      url: "#",
      icon: "user",
      isActive: true,
      items: [
        {
          title: "Perfil de acesso",
          url: "/admin/profile-access",
          icon: "user",
        },
        {
          title: "Permissão de usuário",
          url: "/admin/permission",
          icon: "user",
        },
        {
          title: "Cadastro de usuário",
          url: "/admin/user-registration",
          icon: "user",
        },
        {
          title: "Usuários masters",
          url: "/admin/master-users",
          icon: "master",
        },
      ],
    },
    {
      title: "Fornecedores",
      url: "#",
      icon: "container",
      isActive: true,
      items: [
        {
          title: "Cadastro de fornecedor",
          url: "/admin/supplier",
          icon: "handShake",
        },
        {
          title: "Cadastro de peças",
          url: "/admin/part",
          icon: "container",
        },
      ],
    },
    {
      title: "Veículos",
      url: "#",
      icon: "truck",
      isActive: true,
      items: [
        {
          title: "Tipo de veículo",
          url: "/admin/vehicle-type",
          icon: "truck",
        },
        {
          title: "Tipo de combustível",
          url: "/admin/fuel-type",
          icon: "fuel",
        },
        {
          title: "Cadastro de abastecimento",
          url: "/admin/fuel",
          icon: "supply",
        },
        {
          title: "Cadastro de motoristas",
          url: "/admin/driver",
          icon: "driver",
        },
        {
          title: "Cadastro de veículo",
          url: "/admin/vehicle",
          icon: "truck",
        },
        {
          title: "Checklist veicular",
          url: "/admin/vehicle-checklist",
          icon: "check",
        },
      ],
    },
    {
      title: "Ordens",
      url: "#",
      icon: "log",
      isActive: true,
      items: [
        {
          title: "Ordem de serviço",
          url: "/admin/service-order",
          icon: "log",
        },
        {
          title: "Ordem por peça",
          url: "/admin/service-order-part",
          icon: "log",
        },
        {
          title: "Contas a pagar",
          url: "/admin/account-payable",
          icon: "log",
        },
      ],
    },
  ],
  BUSINESS_ADMIN: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "dashboard",
      isActive: false,
      items: [],
    },
    {
      title: "Kanban",
      url: "/dashboard/kanban",
      icon: "Kanban",
    },
    {
      title: "Cadastro de filiais",
      url: "/dashboard/branch",
      icon: "split",
    },
    {
      title: "Multas",
      url: "/dashboard/fine",
      icon: "fine",
    },
    {
      title: "Entregas",
      url: "/dashboard/deliveries",
      icon: "package",
    },
    {
      title: "Rotas",
      url: "/dashboard/routes",
      icon: "route",
    },
    {
      title: "Usuários",
      url: "#",
      icon: "user",
      isActive: true,
      items: [
        {
          title: "Perfil de acesso",
          url: "/dashboard/profile-access",
          icon: "user",
        },
        {
          title: "Permissão de usuário",
          url: "/dashboard/permission",
          icon: "user",
        },
        {
          title: "Cadastro de usuário",
          url: "/dashboard/user-registration",
          icon: "user",
        },
      ],
    },
    {
      title: "Fornecedores",
      url: "#",
      icon: "container",
      isActive: true,
      items: [
        {
          title: "Cadastro de fornecedor",
          url: "/dashboard/supplier",
          icon: "handShake",
        },
        {
          title: "Cadastro de peças",
          url: "/dashboard/part",
          icon: "container",
        },
      ],
    },
    {
      title: "Veículos",
      url: "#",
      icon: "truck",
      isActive: true,
      items: [
        {
          title: "Tipo de veículo",
          url: "/dashboard/vehicle-type",
          icon: "truck",
        },
        {
          title: "Tipo de combustível",
          url: "/dashboard/fuel-type",
          icon: "fuel",
        },
        {
          title: "Cadastro de abastecimento",
          url: "/dashboard/fuel",
          icon: "supply",
        },
        {
          title: "Cadastro de motoristas",
          url: "/dashboard/driver",
          icon: "driver",
        },
        {
          title: "Cadastro de veículo",
          url: "/dashboard/vehicle",
          icon: "truck",
        },
        {
          title: "Checklist veicular",
          url: "/dashboard/vehicle-checklist",
          icon: "check",
        },
      ],
    },
    {
      title: "Ordens",
      url: "#",
      icon: "log",
      isActive: true,
      items: [
        {
          title: "Ordem de serviço",
          url: "/dashboard/service-order",
          icon: "log",
        },
        {
          title: "Ordem por peça",
          url: "/dashboard/service-order-part",
          icon: "log",
        },
        {
          title: "Contas a pagar",
          url: "/dashboard/account-payable",
          icon: "log",
        },
      ],
    },
  ],
  BUSINESS_USER: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "dashboard",
      isActive: false,
      items: [],
    },
    {
      title: "Kanban",
      url: "/dashboard/kanban",
      icon: "Kanban",
    },
    {
      title: "Cadastro de filiais",
      url: "/dashboard/branch",
      icon: "split",
    },
    {
      title: "Multas",
      url: "/dashboard/fine",
      icon: "fine",
    },
    {
      title: "Entregas",
      url: "/dashboard/deliveries",
      icon: "package",
    },
    {
      title: "Rotas",
      url: "/dashboard/routes",
      icon: "route",
    },
    {
      title: "Usuários",
      url: "#",
      icon: "user",
      isActive: true,
      items: [
        {
          title: "Perfil de acesso",
          url: "/dashboard/profile-access",
          icon: "user",
        },
        {
          title: "Permissão de usuário",
          url: "/dashboard/permission",
          icon: "user",
        },
        {
          title: "Cadastro de usuário",
          url: "/dashboard/user-registration",
          icon: "user",
        },
      ],
    },
    {
      title: "Fornecedores",
      url: "#",
      icon: "container",
      isActive: true,
      items: [
        {
          title: "Cadastro de fornecedor",
          url: "/dashboard/supplier",
          icon: "handShake",
        },
        {
          title: "Cadastro de peças",
          url: "/dashboard/part",
          icon: "container",
        },
      ],
    },
    {
      title: "Veículos",
      url: "#",
      icon: "truck",
      isActive: true,
      items: [
        {
          title: "Tipo de veículo",
          url: "/dashboard/vehicle-type",
          icon: "truck",
        },
        {
          title: "Tipo de combustível",
          url: "/dashboard/fuel-type",
          icon: "fuel",
        },
        {
          title: "Cadastro de abastecimento",
          url: "/dashboard/fuel",
          icon: "supply",
        },
        {
          title: "Cadastro de motoristas",
          url: "/dashboard/driver",
          icon: "driver",
        },
        {
          title: "Cadastro de veículo",
          url: "/dashboard/vehicle",
          icon: "truck",
        },
        {
          title: "Checklist veicular",
          url: "/dashboard/vehicle-checklist",
          icon: "check",
        },
      ],
    },
    {
      title: "Ordens",
      url: "#",
      icon: "log",
      isActive: true,
      items: [
        {
          title: "Ordem de serviço",
          url: "/dashboard/service-order",
          icon: "log",
        },
        {
          title: "Ordem por peça",
          url: "/dashboard/service-order-part",
          icon: "log",
        },
        {
          title: "Contas a pagar",
          url: "/dashboard/account-payable",
          icon: "log",
        },
      ],
    },
  ],
};

export { protectedNavItemsByRole, protectedNavIcons };
export type { ProtectedNavItem };
