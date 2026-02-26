"use server";

import { getCookies } from "../../cookies";

interface DeleteBusinessProps {
  message: string;
}

const handleDeleteBusiness = async (businessId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteBusinessError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteBusiness = `${process.env.HTTP_REQUEST}/business/delete-business/${businessId}`;

  try {
    const response = await fetch(deleteBusiness, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteBusinessProps;

    if (!response.ok && message) {
      return { deleteBusinessError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteBusinessError:
        "Ocorreu um erro inesperado ao tentar deletar a empresa.",
    };
  }
};

export { handleDeleteBusiness };
