"use server";

import { createUpdatePermissionSchema } from "@/schemas/create-update-permission-schema";
import { getCookies } from "../../cookies";

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
    const response = await fetch(createPermission, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(permissionData),
    });

    const { message } = (await response.json()) as CreatePermissionProps;

    if (!response.ok && message) {
      return {
        createPermissionError: { createPermissionErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createPermissionError: {
        createPermissionErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a permissão.",
      },
    };
  }
};

export { handleCreatePermission };
