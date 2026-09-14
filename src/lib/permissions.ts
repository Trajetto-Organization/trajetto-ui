/**
 * Every permission key the platform knows, and the one place that knows them.
 *
 * The type, the zod tuple and the labels below are all derived from this
 * object — adding a key here is the whole job. It used to be spelled out in
 * four places (this object, a union type, an enum and a second label map) and
 * one of them fell behind: the enum missed delivery_manage, occurrence_manage
 * and integration_manage, so the permission form rejected exactly those three
 * with "A permissão é obrigatória".
 *
 * Mirrors config/permissions.ts on the API, which is the enforcement side.
 */
const permissions = {
  BRANCH_MANAGE: "branch_manage",
  PROFILE_ACCESS_MANAGE: "profile_access_manage",
  USER_PERMISSION_MANAGE: "user_permission_manage",
  USER_REGISTRATION_MANAGE: "user_registration_manage",
  PART_MANAGE: "part_manage",
  SUPPLIER_MANAGE: "supplier_manage",
  VEHICLE_TYPE_MANAGE: "vehicle_type_manage",
  FUEL_TYPE_MANAGE: "fuel_type_manage",
  DRIVER_MANAGE: "driver_manage",
  VEHICLE_MANAGE: "vehicle_manage",
  SERVICE_ORDER_MANAGE: "service_order_manage",
  SERVICE_ORDER_PART_MANAGE: "service_order_part_manage",
  ACCOUNT_PAYABLE_MANAGE: "account_payable_manage",
  KANBAN_MANAGE: "kanban_manage",
  FINE_MANAGE: "fine_manage",
  FUEL_MANAGE: "fuel_manage",
  VEHICLE_CHECKLIST_MANAGE: "vehicle_checklist_manage",
  DELIVERY_MANAGE: "delivery_manage",
  OCCURRENCE_MANAGE: "occurrence_manage",
  INTEGRATION_MANAGE: "integration_manage",
} as const;

/** The key type, derived so it cannot drift from the keys themselves. */
type PermissionKey = (typeof permissions)[keyof typeof permissions];

/**
 * Non-empty tuple shape that z.enum requires. Built from the same object, so
 * a new permission is accepted by every form the moment it is declared.
 */
const permissionKeys = Object.values(permissions) as [
  PermissionKey,
  ...PermissionKey[],
];

const permissionLabels = {
  [permissions.BRANCH_MANAGE]: "Gerenciar Filiais",
  [permissions.PROFILE_ACCESS_MANAGE]: "Gerenciar Perfis de Acesso",
  [permissions.USER_PERMISSION_MANAGE]: "Gerenciar Permissões",
  [permissions.USER_REGISTRATION_MANAGE]: "Gerenciar Cadastro de Usuários",
  [permissions.PART_MANAGE]: "Gerenciar Peças",
  [permissions.SUPPLIER_MANAGE]: "Gerenciar Fornecedores",
  [permissions.VEHICLE_TYPE_MANAGE]: "Gerenciar tipos de veículos",
  [permissions.FUEL_TYPE_MANAGE]: "Gerenciar tipos de combustíveis",
  [permissions.DRIVER_MANAGE]: "Gerenciar Motoristas",
  [permissions.VEHICLE_MANAGE]: "Gerenciar Veículos",
  [permissions.SERVICE_ORDER_MANAGE]: "Gerenciar Ordens de Serviço",
  [permissions.SERVICE_ORDER_PART_MANAGE]:
    "Gerenciar Ordens de Serviço Por Peça",
  [permissions.ACCOUNT_PAYABLE_MANAGE]: "Gerenciar Contas a Pagar",
  [permissions.KANBAN_MANAGE]: "Gerenciar Kanban",
  [permissions.FINE_MANAGE]: "Gerenciar Multas",
  [permissions.FUEL_MANAGE]: "Gerenciar Abastecimentos",
  [permissions.VEHICLE_CHECKLIST_MANAGE]: "Gerenciar Checklist dos Veículos",
  [permissions.DELIVERY_MANAGE]: "Gerenciar Entregas",
  [permissions.OCCURRENCE_MANAGE]: "Gerenciar Ocorrências de Entrega",
  [permissions.INTEGRATION_MANAGE]: "Gerenciar Integrações",
};

/**
 * Human-readable name, used by tables, the profile-access matrix and the
 * tooltips that list what a disabled button is missing — all reading the same
 * map, so one permission reads the same everywhere in the app.
 */
function getPermissionName(permissionKey: PermissionKey): string {
  return permissionLabels[permissionKey] ?? permissionKey;
}

export { permissionLabels, permissions, permissionKeys, getPermissionName };
export type { PermissionKey };
