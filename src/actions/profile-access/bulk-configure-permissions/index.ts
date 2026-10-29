"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { bulkConfigurePermissionsSchema } from "@/schemas/bulk-configure-permissions-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

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
  } catch (error) {
    logActionError(
      "profile-access/bulk-configure-permissions (permissions)",
      error,
    );
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
    const response = await apiFetch(
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

    if (!response.ok) {
      return {
        bulkConfigurePermissionsError: {
          bulkConfigurePermissionsErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-permission");

    return { successMessage: message };
  } catch (error) {
    logActionError("profile-access/bulk-configure-permissions", error);
    return {
      bulkConfigurePermissionsError: {
        bulkConfigurePermissionsErrorMessage:
          "Ocorreu um erro inesperado ao configurar as permissões.",
      },
    };
  }
};

export { handleBulkConfigurePermissions };
