import type { PermissionKey } from "../(protected)/_components/shared/common.types";

/** Sellable modules, mirroring the API's BusinessModule enum. */
type BusinessModuleKey = "FLEET" | "DELIVERIES";

interface AppRoute {
  path: string;
  title: string;
  /**
   * Matches only itself, never lending its verdict to children. Set on the
   * section roots: "/dashboard" is a prefix of every company page, so
   * without this an unregistered /dashboard/anything would inherit the
   * always-open verdict of the dashboard itself.
   */
  exact?: boolean;
  requiredPermission?: PermissionKey;
  /**
   * Module the page belongs to. It must mirror the `verifyModuleEnabled`
   * hook registered on the matching API routes — the API is the enforcement
   * point, this only decides what is worth showing and reaching.
   */
  requiredModule?: BusinessModuleKey;
}

/**
 * The single place that answers "who may reach this page?".
 *
 * Sidebar, command bar, dashboard cards, the server-side gate in
 * ProtectedProvider and the realtime gate in useNavigationSecurityCheck all
 * read from here. They used to carry their own copy of the rules, which is
 * how the command bar kept showing fleet pages to a company that had the
 * module switched off: four lists, one of them forgotten.
 *
 * Adding a page means adding one entry here.
 *
 * On what is NOT gated by FLEET: vehicles, drivers, vehicle types and fuel
 * types are shared ground — a delivery is assigned to a vehicle and a driver,
 * so a company that hired only Entregas still registers both. FLEET owns what
 * only fleet management uses: fuelling, checklists, service orders, parts,
 * suppliers, payables and fines.
 */
const appRoutes: AppRoute[] = [
  // ADMIN Routes (MASTER only — the back office is never module-gated)
  { path: "/admin", title: "Administrativo", exact: true },
  { path: "/admin/activity", title: "Atividades recentes" },
  { path: "/admin/quote", title: "Orçamentos" },
  { path: "/admin/business", title: "Empresas" },
  { path: "/admin/branch", title: "Filiais" },
  { path: "/admin/profile-access", title: "Perfil de acesso" },
  { path: "/admin/permission", title: "Permissão do usuário" },
  { path: "/admin/user-registration", title: "Cadastro de usuário" },
  { path: "/admin/master-users", title: "Usuários masters" },
  { path: "/admin/vehicle-type", title: "Tipos de veículos" },
  { path: "/admin/fuel-type", title: "Tipo de combustível" },
  { path: "/admin/driver", title: "Motoristas" },
  { path: "/admin/vehicle", title: "Veículos" },
  { path: "/admin/kanban", title: "Kanban" },
  {
    path: "/admin/supplier",
    title: "Fornecedores",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/part",
    title: "Peças",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/service-order",
    title: "Ordem de serviço",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/service-order-part",
    title: "Ordem de serviço por peça",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/account-payable",
    title: "Contas a pagar",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/fine",
    title: "Multas",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/fuel",
    title: "Abastecimento",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/vehicle-checklist",
    title: "Checklist",
    requiredModule: "FLEET",
  },
  {
    path: "/admin/deliveries",
    title: "Entregas",
    requiredModule: "DELIVERIES",
  },

  // DASHBOARD Routes (to BUSINESS_ADMIN and BUSINESS_USER)
  { path: "/dashboard", title: "Dashboard", exact: true },
  { path: "/dashboard/activity", title: "Atividades recentes" },
  { path: "/dashboard/kanban", title: "Kanban" },
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
    path: "/dashboard/supplier",
    title: "Fornecedores",
    requiredPermission: "supplier_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/part",
    title: "Peças",
    requiredPermission: "part_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/service-order",
    title: "Ordem de serviço",
    requiredPermission: "service_order_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/service-order-part",
    title: "Ordem de serviço por peça",
    requiredPermission: "service_order_part_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/account-payable",
    title: "Contas a pagar",
    requiredPermission: "account_payable_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/fine",
    title: "Multas",
    requiredPermission: "fine_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/fuel",
    title: "Abastecimento",
    requiredPermission: "fuel_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/vehicle-checklist",
    title: "Checklist",
    requiredPermission: "vehicle_checklist_manage",
    requiredModule: "FLEET",
  },
  {
    path: "/dashboard/deliveries",
    title: "Entregas",
    requiredPermission: "delivery_manage",
    requiredModule: "DELIVERIES",
  },

  // DRIVER routes — no permission gate (drivers have no profile access), but
  // the module gate still applies: no fleet plan, no fuelling flow.
  { path: "/driver/kanban", title: "Kanban" },
  { path: "/driver/vehicles", title: "Veículos" },
  {
    path: "/driver/account-payable",
    title: "Contas a pagar",
    requiredModule: "FLEET",
  },

  // Other routes
  { path: "/profile", title: "Minha Conta" },
  { path: "/notifications", title: "Notificações" },
];

export { appRoutes };
export type { AppRoute, BusinessModuleKey };
