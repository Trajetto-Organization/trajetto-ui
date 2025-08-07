"use server";

import { getCookies } from "../cookies";

interface DeleteUserProps {
  message: string;
}

const handleDeleteUserRegistration = async (userId: string) => {
  const deleteUser = `${process.env.HTTP_REQUEST}/user/delete-user/${userId}`;
  const tokenAccess = await getCookies("tkey");

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
