"use server";

import { getCookies } from "../../cookies";

interface DeleteUserProps {
  message: string;
}

const handleDeleteUserRegistration = async (userId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteUserError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteUser = `${process.env.HTTP_REQUEST}/user/delete-user/${userId}`;

  try {
    const response = await fetch(deleteUser, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteUserProps;

    if (!response.ok && message) {
      return { deleteUserError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteUserError:
        "Ocorreu um erro inesperado ao tentar deletar o usuário.",
    };
  }
};

export { handleDeleteUserRegistration };
