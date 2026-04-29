"use server";

import { getCookies } from "../../cookies";

interface DeleteBusinessProps {
  businessId: string;
  code: string;
}

interface DeleteBusinessResponseProps {
  message: string;
}

const handleDeleteBusiness = async ({
  businessId,
  code,
}: DeleteBusinessProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteBusinessError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  if (!code) {
    return {
      deleteBusinessError: "Código de confirmação é obrigatório.",
    };
  }

  const deleteBusiness = `${process.env.HTTP_REQUEST}/business/delete-business/${businessId}`;

  try {
    const response = await fetch(deleteBusiness, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const { message } = (await response.json()) as DeleteBusinessResponseProps;

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
