"use server";

import { getCookies } from "../../cookies";

interface DeleteMasterUserProps {
  message: string;
}

const handleDeleteMasterUser = async (masterUserId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteMasterUserError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteMasterUser = `${process.env.HTTP_REQUEST}/user/delete-master-user/${masterUserId}`;

  try {
    const response = await fetch(deleteMasterUser, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteMasterUserProps;

    if (!response.ok && message) {
      return { deleteMasterUserError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteMasterUserError:
        "Ocorreu um erro inesperado ao tentar deletar o usuário Master.",
    };
  }
};

export { handleDeleteMasterUser };
