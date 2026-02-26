"use server";

import { getCookies } from "../../cookies";

interface DeleteAccountPayableProps {
  businessId: string;
  accountPayableId: string;
}

interface DeleteAccountPayableResponseProps {
  message: string;
}

const handleDeleteAccountPayable = async ({
  accountPayableId,
  businessId,
}: DeleteAccountPayableProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteAccountPayableError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteAccountPayable = `${process.env.HTTP_REQUEST}/account-payable/delete-account-payable/${accountPayableId}/business/${businessId}`;

  try {
    const response = await fetch(deleteAccountPayable, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteAccountPayableResponseProps;

    if (!response.ok && message) {
      return { deleteAccountPayableError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteAccountPayableError:
        "Ocorreu um erro inesperado ao tentar deletar uma conta a pagar.",
    };
  }
};

export { handleDeleteAccountPayable };
