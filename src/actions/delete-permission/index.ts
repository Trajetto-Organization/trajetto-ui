"use server";

import { getCookies } from "../cookies";

interface DeletePermissionProps {
  message: string;
}

const handleDeletePermission = async (permissionId: string) => {
  const deletePermission = `${process.env.HTTP_REQUEST}/permission/delete-permission/${permissionId}`;
  const tokenAccess = await getCookies("tkey");

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
