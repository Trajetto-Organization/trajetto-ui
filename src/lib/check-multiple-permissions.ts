import { PermissionKey } from "@/app/(protected)/_components/dto";
import { useAuthStore } from "../store/auth-store";

import { useEffect, useMemo } from "react";

interface RequiredPermission {
  key: PermissionKey;
  action: "read" | "write";
  label: string;
}

/**
 * Checks multiple permissions in a single hook
 */
function useCheckMultiplePermissions(
  requiredPermissions: RequiredPermission[],
) {
  // Use a single call to auth store
  const { role, permissions, loadAuth, isLoaded } = useAuthStore();

  // Load auth data if needed
  useEffect(() => {
    if (!isLoaded || role === null) {
      loadAuth();
    }
  }, [isLoaded, role, loadAuth]);

  // Process all permission checks in one go using useMemo
  return useMemo(() => {
    // Check individual permissions
    const permissionResults = requiredPermissions.map(
      ({ key, action, label }) => {
        let hasPermission = false;

        // Admin roles have all permissions
        if (role === "MASTER" || role === "BUSINESS_ADMIN") {
          hasPermission = true;
        } else {
          // Look for the specific permission
          const permission = permissions.find(
            (perm) => perm.permissionKey === key,
          );

          // Check if permission exists and if the user has the required access type
          if (permission) {
            hasPermission =
              action === "write" ? permission.canWrite : permission.canRead;
          }
        }

        return {
          key,
          action,
          label,
          hasPermission,
        };
      },
    );

    // Check if all permissions are granted
    const hasAllPermissions = permissionResults.every(
      (result) => result.hasPermission,
    );

    // Get the list of missing permissions
    const missingPermissions = permissionResults
      .filter((result) => !result.hasPermission)
      .map((result) => result.label);

    // Generate appropriate tooltip message
    let tooltipMessage = "";
    if (missingPermissions.length > 0) {
      tooltipMessage = `Você não possui as seguintes permissões necessárias: ${missingPermissions.join(", ")}`;
    }

    return {
      hasAllPermissions,
      missingPermissions,
      tooltipMessage,
    };
  }, [role, permissions, requiredPermissions]);
}

/**
 * Returns permission name in a human-readable format
 */
function getPermissionName(permissionKey: PermissionKey): string {
  const permissionNames: Record<PermissionKey, string> = {
    branch_manage: "Gerenciar Filiais",
    profile_access_manage: "Gerenciar Perfis de Acesso",
    user_permission_manage: "Gerenciar Permissões de Usuário",
    user_registration_manage: "Gerenciar Cadastro de Usuários",
    part_manage: "Gerenciar Peças",
    supplier_manage: "Gerenciar Fornecedores",
    vehicle_type_manage: "Gerenciar Tipos de Veículo",
    fuel_type_manage: "Gerenciar Tipos de Combustível",
    driver_manage: "Gerenciar Motoristas",
    service_order_manage: "Gerenciar Ordens de Serviço",
    vehicle_manage: "Gerenciar Veículos",
    service_order_part_manage: "Gerenciar Ordens de Serviço Por Peça",
    account_payable_manage: "Gerenciar Contas a Pagar",
    kanban_manage: "Gerenciar Kanban",
    fine_manage: "Gerenciar Multas",
  };

  return permissionNames[permissionKey] || permissionKey;
}

export { useCheckMultiplePermissions, getPermissionName };
