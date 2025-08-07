"use server";

import { createUpdatePermissionSchema } from "@/schemas/create-update-permission-schema";
import { getCookies } from "../cookies";

interface PermissionProps {
  message: string;
}

const handleUpdatePermission = async (
  state: any,
  updatePermissionValues: FormData,
) => {
  if (updatePermissionValues.type === "RESET") {
    return {};
  }

  const permissionId = updatePermissionValues.get("permissionId");

  const updatePermission = `${process.env.HTTP_REQUEST}/permission/update-permission/${permissionId}`;
  const tokenAccess = await getCookies("tkey");

  const permissionValues = Object.fromEntries(updatePermissionValues.entries());

  const updatePermissionValidation =
    createUpdatePermissionSchema.safeParse(permissionValues);

  if (updatePermissionValidation.error) {
    const formatError = updatePermissionValidation.error.flatten();

    return {
      updatePermissionError: formatError.fieldErrors,
    };
  }

  const permissionData = updatePermissionValidation.data;

  try {
    const response = await fetch(updatePermission, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(permissionData),
    });

    const { message } = (await response.json()) as PermissionProps;

    if (!response.ok && message) {
      return {
        updatePermissionError: { updatePermissionErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      updatePermissionError: {
        updatePermissionErrorMessage:
          "Ocorreu um erro inesperado ao tentar atualizar a permissão.",
      },
    };
  }
};

export { handleUpdatePermission };
