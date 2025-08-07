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
} as const;

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
};

export { permissionLabels, permissions };
