import { describe, expect, it } from "vitest";

import {
  getPermissionName,
  permissionKeys,
  permissionLabels,
} from "@/lib/permissions";

/**
 * The names a permission is shown by (tables, the profile matrix, the
 * tooltips of a disabled button). Pinned word for word: the 06/10 mutation run
 * showed any of them could be blanked with every test still green.
 */
describe("permission labels", () => {
  it("names every key", () => {
    expect(permissionLabels).toEqual({
      branch_manage: "Gerenciar Filiais",
      profile_access_manage: "Gerenciar Perfis de Acesso",
      user_permission_manage: "Gerenciar Permissões",
      user_registration_manage: "Gerenciar Cadastro de Usuários",
      part_manage: "Gerenciar Peças",
      supplier_manage: "Gerenciar Fornecedores",
      vehicle_type_manage: "Gerenciar tipos de veículos",
      fuel_type_manage: "Gerenciar tipos de combustíveis",
      driver_manage: "Gerenciar Motoristas",
      vehicle_manage: "Gerenciar Veículos",
      service_order_manage: "Gerenciar Ordens de Serviço",
      service_order_part_manage: "Gerenciar Ordens de Serviço Por Peça",
      account_payable_manage: "Gerenciar Contas a Pagar",
      kanban_manage: "Gerenciar Kanban",
      fine_manage: "Gerenciar Multas",
      fuel_manage: "Gerenciar Abastecimentos",
      vehicle_checklist_manage: "Gerenciar Checklist dos Veículos",
      delivery_manage: "Gerenciar Entregas",
      occurrence_manage: "Gerenciar Ocorrências de Entrega",
      integration_manage: "Gerenciar Integrações",
    });
    expect(Object.keys(permissionLabels).sort()).toEqual(
      [...permissionKeys].sort(),
    );
  });

  it("falls back to the key for one without a label", () => {
    expect(getPermissionName("fuel_manage")).toBe("Gerenciar Abastecimentos");
    expect(getPermissionName("unknown_manage" as never)).toBe("unknown_manage");
  });
});
