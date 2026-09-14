"use server";

import { getCookies } from "../../cookies";

interface BusinessEntitlementModule {
  module: string;
  enabled: boolean;
}

interface BusinessEntitlementsData {
  modules: BusinessEntitlementModule[];
  vehicle_limit: number;
  /** Active fleet — vehicles occupying a contracted slot (non-INACTIVE). */
  vehicle_count: number;
  /** Inactive vehicles: history preserved, slot freed. */
  vehicle_inactive_count?: number;
  vehicle_limit_enabled: boolean;
}

interface ModuleImpactData {
  module: string;
  /** Records that stop being reachable — none of them are deleted. */
  records: Array<{ label: string; count: number }>;
  affectedUsers: number;
  /** Work in flight, which is what makes the timing of the switch matter. */
  inFlight: Array<{ label: string; count: number }>;
}

interface ModuleImpactResponse {
  success: boolean;
  message: string;
  data?: ModuleImpactData;
}

interface EntitlementsResponse {
  success: boolean;
  message: string;
  data?: BusinessEntitlementsData;
}

const getBusinessEntitlements = async (
  businessId: string,
): Promise<EntitlementsResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/business/entitlements/${businessId}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao obter os módulos da empresa.",
      };
    }

    return {
      success: true,
      message: "Módulos obtidos com sucesso.",
      data: result.data as BusinessEntitlementsData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao obter os módulos da empresa.",
    };
  }
};

/**
 * What the company has riding on a module, read right before the master
 * confirms switching it off. MASTER-only on the API.
 */
const getModuleImpact = async (
  businessId: string,
  module: string,
): Promise<ModuleImpactResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/business/entitlements/${businessId}/impact/${module}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao consultar o impacto do módulo.",
      };
    }

    return {
      success: true,
      message: "Impacto consultado com sucesso.",
      data: result.data as ModuleImpactData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao consultar o impacto do módulo.",
    };
  }
};

const updateBusinessEntitlement = async (
  businessId: string,
  module: string,
  enabled: boolean,
): Promise<{ success: boolean; message: string }> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/business/entitlements/${businessId}`,
      {
        credentials: "include",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ module, enabled }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao atualizar o módulo da empresa.",
      };
    }

    return {
      success: true,
      message: result.message || "Módulo atualizado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao atualizar o módulo da empresa.",
    };
  }
};

export { getBusinessEntitlements, updateBusinessEntitlement, getModuleImpact };
export type {
  BusinessEntitlementsData,
  BusinessEntitlementModule,
  ModuleImpactData,
};
