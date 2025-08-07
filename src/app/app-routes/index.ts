import { PermissionKey } from "../(protected)/_components/dto";

interface AppRoute {
  path: string;
  title: string;
  requiredPermission?: PermissionKey;
}

const appRoutes: AppRoute[] = [
  // ADMIN Routes
  { path: "/admin", title: "Administrativo" },
  { path: "/admin/quote", title: "Orçamentos" },
  { path: "/admin/business", title: "Empresas" },
  { path: "/admin/branch", title: "Filiais" },
  { path: "/admin/profile-access", title: "Perfil de acesso" },
  { path: "/admin/permission", title: "Permissão do usuário" },
  { path: "/admin/user-registration", title: "Cadastro de usuário" },
  { path: "/admin/supplier", title: "Fornecedores" },
  { path: "/admin/part", title: "Peças" },
  { path: "/admin/vehicle-type", title: "Tipos de veículos" },
  { path: "/admin/fuel-type", title: "Tipo de combustível" },
  { path: "/admin/driver", title: "Motoristas" },
  { path: "/admin/vehicle", title: "Veículos" },
  { path: "/admin/service-order", title: "Ordem de serviço" },
  { path: "/admin/service-order-part", title: "Ordem de serviço por peça" },
  { path: "/admin/account-payable", title: "Contas a pagar" },
  {
    path: "/admin/kanban",
    title: "Kanban",
  },
  {
    path: "/admin/fine",
    title: "Multas",
  },

  // DASHBOARD Routes (to BUSINESS_ADMIN and BUSINESS_USER)
  { path: "/dashboard", title: "Dashboard" },
  {
    path: "/dashboard/profile-access",
    title: "Perfil de acesso",
    requiredPermission: "profile_access_manage",
  },
  {
    path: "/dashboard/permission",
    title: "Permissão do usuário",
    requiredPermission: "user_permission_manage",
  },
  {
    path: "/dashboard/user-registration",
    title: "Cadastro de usuário",
    requiredPermission: "user_registration_manage",
  },
  {
    path: "/dashboard/branch",
    title: "Filiais",
    requiredPermission: "branch_manage",
  },
  {
    path: "/dashboard/supplier",
    title: "Peças",
    requiredPermission: "supplier_manage",
  },
  {
    path: "/dashboard/part",
    title: "Peças",
    requiredPermission: "part_manage",
  },
  {
    path: "/dashboard/vehicle-type",
    title: "Tipos de veículos",
    requiredPermission: "vehicle_type_manage",
  },
  {
    path: "/dashboard/fuel-type",
    title: "Tipo de combustível",
    requiredPermission: "fuel_type_manage",
  },
  {
    path: "/dashboard/driver",
    title: "Motoristas",
    requiredPermission: "driver_manage",
  },
  {
    path: "/dashboard/vehicle",
    title: "Veículos",
    requiredPermission: "vehicle_manage",
  },
  {
    path: "/dashboard/service-order",
    title: "Ordem de serviço",
    requiredPermission: "service_order_manage",
  },
  {
    path: "/dashboard/service-order-part",
    title: "Ordem de serviço por peça",
    requiredPermission: "service_order_part_manage",
  },
  {
    path: "/dashboard/account-payable",
    title: "Contas a pagar",
    requiredPermission: "account_payable_manage",
  },
  {
    path: "/dashboard/kanban",
    title: "Kanban",
  },
  {
    path: "/dashboard/fine",
    title: "Multas",
    requiredPermission: "fine_manage",
  },

  // Other routes
  { path: "/profile", title: "Minha Conta" },
  { path: "/notifications", title: "Notificações" },
];

export { appRoutes };
export type { AppRoute };
