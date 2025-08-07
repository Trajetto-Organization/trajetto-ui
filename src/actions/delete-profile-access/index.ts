"use server";

import { getCookies } from "../cookies";

interface DeleteProfileAccessProps {
  message: string;
}

const handleDeleteProfileAccess = async (profileAccessId: string) => {
  const deleteProfileAccess = `${process.env.HTTP_REQUEST}/profile-access/delete-profile-access/${profileAccessId}`;
  const tokenAccess = await getCookies("tkey");

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
