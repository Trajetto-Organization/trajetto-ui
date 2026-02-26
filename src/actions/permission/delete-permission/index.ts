"use server";

import { getCookies } from "../../cookies";

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
    const response = await fetch(deletePermission, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeletePermissionProps;

    if (!response.ok && message) {
      return { deletePermissionError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deletePermissionError:
        "Ocorreu um erro inesperado ao tentar deletar a permissão.",
    };
  }
};

export { handleDeletePermission };
