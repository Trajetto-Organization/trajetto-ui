"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface DeletePermissionProps {
  message: string;
}

const handleDeletePermission = async (permissionId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deletePermissionError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deletePermission = `${process.env.HTTP_REQUEST}/permission/delete-permission/${permissionId}`;

  try {
    const response = await apiFetch(deletePermission, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeletePermissionProps;

    if (!response.ok) {
      return {
        deletePermissionError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("permission/delete-permission", error);
    return {
      deletePermissionError:
        "Ocorreu um erro inesperado ao tentar deletar a permissão.",
    };
  }
};

export { handleDeletePermission };
