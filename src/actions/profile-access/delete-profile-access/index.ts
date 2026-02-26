"use server";

import { getCookies } from "../../cookies";

interface DeleteProfileAccessProps {
  message: string;
}

const handleDeleteProfileAccess = async (profileAccessId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteProfileAccessError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/delete-profile-access/${profileAccessId}`;

  try {
    const response = await fetch(deleteProfileAccess, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteProfileAccessProps;

    if (!response.ok && message) {
      return { deleteProfileAccessError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteProfileAccessError:
        "Ocorreu um erro inesperado ao tentar deletar o perfil de acesso.",
    };
  }
};

export { handleDeleteProfileAccess };
