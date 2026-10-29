import type {
  PermissionKey,
  UserRole,
} from "../(protected)/_components/shared/common.types";

/** Sellable modules, mirroring the API's BusinessModule enum. */
type BusinessModuleKey = "FLEET" | "DELIVERIES";

interface AppRoute {
  /**
   * A segment starting with ":" matches any one segment, so a page under an
   * id (/driver/vehicles/:vehicleId/fuels) carries its own rule instead of
   * inheriting the parent's by prefix.
   */
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
  /**
   * Roles the page exists for, when the API restricts it by role rather than
   * by permission (verifyUserRole). Without it the palette offered "Atividades
   * recentes" to every employee and the edge middleware sent them back.
   */
  allowedRoles?: UserRole[];
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
  // ADMIN Routes (MASTER only). The menu never hides a module from the MASTER,
  // who works across companies: whether the SELECTED company hired it is
  // answered on the page, with the "Módulo não contratado" state (decision
  // 4.3). `requiredModule` here documents the page and gates company roles.
  { path: "/admin", title: "Administrativo", exact: true },
  {
    path: "/admin/activity",
    title: "Atividades recentes",
    allowedRoles: ["MASTER"],
  },
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
  {
    path: "/admin/routes",
    title: "Rotas",
    requiredModule: "DELIVERIES",
  },
  {
    // The master surface of the same two screens that were missing from the
    // dashboard side. The MASTER's menus are not gated by module (they span
    // companies); the selected company's plan is answered on the page, by the
    // API's MODULE_NOT_ENABLED. This is about the registry being complete.
    path: "/admin/control-tower",
    title: "Torre de Controle",
    requiredModule: "DELIVERIES",
  },
  {
    path: "/admin/driver-pauses",
    title: "Pausas dos motoristas",
    requiredModule: "DELIVERIES",
  },
  {
    // Decision 4.3: an API key only works with Entregas (ensure-api-key), and
    // every webhook topic is a delivery one — a fleet-only company would mint
    // keys that always answer 403.
    path: "/admin/integrations",
    title: "Integrações",
    requiredModule: "DELIVERIES",
  },

  // DASHBOARD Routes (to BUSINESS_ADMIN and BUSINESS_USER)
  { path: "/dashboard", title: "Dashboard", exact: true },
  {
    // The API serves the company feed to BUSINESS_ADMIN only
    // (activity-routes verifyUserRole); an employee sees their own actions on
    // the dashboard card instead.
    path: "/dashboard/activity",
    title: "Atividades recentes",
    allowedRoles: ["BUSINESS_ADMIN"],
  },
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
  {
    /**
     * The same permission and module as Entregas, on purpose: a route is HOW
     * deliveries are dispatched, and whoever can write deliveries can already
     * assign a driver to twelve of them from that screen — the same act.
     */
    path: "/dashboard/routes",
    title: "Rotas",
    requiredPermission: "delivery_manage",
    requiredModule: "DELIVERIES",
  },
  {
    /**
     * Was missing from this registry entirely, and the sidebar linked to it
     * anyway.
     *
     * `canAccessPath` answers "allow" for a path it does not know — which is
     * right for the marketing pages and wrong here: the tower had no client
     * gate at all. Anybody could type the URL, including a driver and a
     * company without the deliveries module, and get the shell of a manager
     * screen whose API calls then answered 403. A broken screen where every
     * other page shows a boundary.
     *
     * The API's own rule is `delivery_manage:read` plus an explicit refusal
     * of driver tokens, so that is what is mirrored here.
     */
    path: "/dashboard/control-tower",
    title: "Torre de Controle",
    requiredPermission: "delivery_manage",
    requiredModule: "DELIVERIES",
  },
  {
    /**
     * The drivers' day from the deliveries operation (decision 6.1), with the
     * same key the API asks for (`delivery_manage:read`, driver-pause-routes)
     * and the same key as its neighbours in Entregas.
     */
    path: "/dashboard/driver-pauses",
    title: "Pausas dos motoristas",
    requiredPermission: "delivery_manage",
    requiredModule: "DELIVERIES",
  },
  {
    /**
     * Same gap, and a sharper one: an API key hands the whole operation of a
     * company to whoever holds it, which is why the API keeps
     * `integration_manage` separate from every other permission. Behind
     * Entregas since decision 4.3: the key and every webhook topic are the
     * deliveries module's.
     */
    path: "/dashboard/integrations",
    title: "Integrações",
    requiredPermission: "integration_manage",
    requiredModule: "DELIVERIES",
  },

  // DRIVER routes — no permission gate (drivers have no profile access), but
  // the module gate still applies: no fleet plan, no fuelling flow.
  { path: "/driver/kanban", title: "Kanban" },
  { path: "/driver/vehicles", title: "Veículos" },
  {
    // Registered on their own: by prefix they inherited /driver/vehicles,
    // which has no module, and a driver of a company without FLEET opened
    // them to read "módulo não habilitado" from the API.
    path: "/driver/vehicles/:vehicleId/fuels",
    title: "Abastecimentos",
    requiredModule: "FLEET",
  },
  {
    path: "/driver/vehicles/:vehicleId/service-orders",
    title: "Ordens de serviço",
    requiredModule: "FLEET",
  },
  {
    path: "/driver/account-payable",
    title: "Contas a pagar",
    requiredModule: "FLEET",
  },

  // Other routes
  { path: "/profile", title: "Minha Conta" },
  { path: "/notifications", title: "Notificações" },
  {
    /**
     * The developer portal (decision 11.1). The page itself is public — the
     * edge gates only the private prefixes, and whoever integrates is often
     * the customer's ERP vendor, with no login. This entry decides only who
     * the product OFFERS it to (sidebar and ⌘K): the rule of Integrações,
     * since only those users can mint the key the portal teaches to use.
     */
    path: "/docs",
    title: "Documentação da API",
    requiredPermission: "integration_manage",
    requiredModule: "DELIVERIES",
  },
];

export { appRoutes };
export type { AppRoute, BusinessModuleKey };
