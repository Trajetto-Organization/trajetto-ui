import {
  Building2,
  CalendarCheckIcon,
  CircuitBoardIcon,
  Command,
  Container,
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
  Receipt,
  Split,
  Truck,
  User,
  UserPen,
  UserX2Icon,
} from "lucide-react";

import { UserRole } from "@/app/(protected)/_components/dto";
import { permissions } from "@/lib/permissions";

import { ProtectedNavItem } from "../dto";

const protectedNavIcons = {
  dashboard: LayoutDashboardIcon,
  logo: Command,
  kanban: CircuitBoardIcon,
  employee: UserX2Icon,
  userPen: UserPen,
  user: User,
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
      requiredPermission: permissions.BRANCH_MANAGE,
    },
    {
      title: "Multas",
      url: "/dashboard/fine",
      icon: "fine",
      requiredPermission: permissions.FINE_MANAGE,
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
          requiredPermission: permissions.PROFILE_ACCESS_MANAGE,
        },
        {
          title: "Permissão de usuário",
          url: "/dashboard/permission",
          icon: "user",
          requiredPermission: permissions.USER_PERMISSION_MANAGE,
        },
        {
          title: "Cadastro de usuário",
          url: "/dashboard/user-registration",
          icon: "user",
          requiredPermission: permissions.USER_REGISTRATION_MANAGE,
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
          requiredPermission: permissions.SUPPLIER_MANAGE,
        },
        {
          title: "Cadastro de peças",
          url: "/dashboard/part",
          icon: "container",
          requiredPermission: permissions.PART_MANAGE,
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
          requiredPermission: permissions.VEHICLE_TYPE_MANAGE,
        },
        {
          title: "Tipo de combustível",
          url: "/dashboard/fuel-type",
          icon: "fuel",
          requiredPermission: permissions.FUEL_TYPE_MANAGE,
        },
        {
          title: "Cadastro de abastecimento",
          url: "/dashboard/fuel",
          icon: "supply",
          requiredPermission: permissions.FUEL_MANAGE,
        },
        {
          title: "Cadastro de motoristas",
          url: "/dashboard/driver",
          icon: "driver",
          requiredPermission: permissions.DRIVER_MANAGE,
        },
        {
          title: "Cadastro de veículo",
          url: "/dashboard/vehicle",
          icon: "truck",
          requiredPermission: permissions.VEHICLE_MANAGE,
        },
        {
          title: "Checklist veicular",
          url: "/dashboard/vehicle-checklist",
          icon: "check",
          requiredPermission: permissions.VEHICLE_CHECKLIST_MANAGE,
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
          requiredPermission: permissions.SERVICE_ORDER_MANAGE,
        },
        {
          title: "Ordem por peça",
          url: "/dashboard/service-order-part",
          icon: "log",
          requiredPermission: permissions.SERVICE_ORDER_PART_MANAGE,
        },
        {
          title: "Contas a pagar",
          url: "/dashboard/account-payable",
          icon: "log",
          requiredPermission: permissions.ACCOUNT_PAYABLE_MANAGE,
        },
      ],
    },
  ],
};

export { protectedNavItemsByRole, protectedNavIcons };
export type { ProtectedNavItem };
