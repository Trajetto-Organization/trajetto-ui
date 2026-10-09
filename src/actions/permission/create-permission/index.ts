"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdatePermissionSchema } from "@/schemas/create-update-permission-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface CreatePermissionProps {
  message: string;
}

const handleCreatePermission = async (
  state: any,
  createPermissionValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createPermissionError: {
        createPermissionErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createPermissionValues.type === "RESET") {
    return {};
  }

  const createPermission = `${process.env.HTTP_REQUEST}/permission/create-permission`;
  const permissionValues = Object.fromEntries(createPermissionValues.entries());

  const createPermissionValidation =
    createUpdatePermissionSchema.safeParse(permissionValues);

  if (createPermissionValidation.error) {
    const formatError = createPermissionValidation.error.flatten();

    return {
      createPermissionError: formatError.fieldErrors,
    };
  }

  const permissionData = createPermissionValidation.data;

  try {
    const response = await apiFetch(createPermission, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(permissionData),
    });

    const { message } = (await response.json()) as CreatePermissionProps;

    if (!response.ok) {
      return {
        createPermissionError: {
          createPermissionErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("permission/create-permission", error);
    return {
      createPermissionError: {
        createPermissionErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a permissão.",
      },
    };
  }
};

export { handleCreatePermission };
