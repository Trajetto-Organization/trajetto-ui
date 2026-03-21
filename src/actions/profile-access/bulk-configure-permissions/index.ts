"use server";

import { bulkConfigurePermissionsSchema } from "@/schemas/bulk-configure-permissions-schema";
import { getCookies } from "../../cookies";

interface BulkConfigurePermissionsResponse {
  message: string;
}

const handleBulkConfigurePermissions = async (
  state: any,
  formData: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      bulkConfigurePermissionsError: {
        bulkConfigurePermissionsErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (formData.type === "RESET") {
    return {};
  }

  const businessId = formData.get("businessId") as string;

  const profileAccessId = formData.get("profileAccessId") as string;
  const permissionsRaw = formData.get("permissions") as string;

  let parsedPermissions: unknown[];
  try {
    parsedPermissions = JSON.parse(permissionsRaw);
  } catch {
    return {
      bulkConfigurePermissionsError: {
        bulkConfigurePermissionsErrorMessage: "Dados de permissões inválidos.",
      },
    };
  }

  const validation = bulkConfigurePermissionsSchema.safeParse({
    businessId,
    profileAccessId,
    permissions: parsedPermissions,
  });

  if (validation.error) {
    const formatError = validation.error.flatten();
    return {
      bulkConfigurePermissionsError: formatError.fieldErrors,
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/permission/bulk-configure-permissions`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      },
    );

    const { message } =
      (await response.json()) as BulkConfigurePermissionsResponse;

    if (!response.ok && message) {
      return {
        bulkConfigurePermissionsError: {
          bulkConfigurePermissionsErrorMessage: message,
        },
      };
    }

    return { successMessage: message };
  } catch {
    return {
      bulkConfigurePermissionsError: {
        bulkConfigurePermissionsErrorMessage:
          "Ocorreu um erro inesperado ao configurar as permissões.",
      },
    };
  }
};

export { handleBulkConfigurePermissions };
