"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

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
    const response = await apiFetch(deleteAccountPayable, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteAccountPayableResponseProps;

    if (!response.ok) {
      return {
        deleteAccountPayableError: message || refusalMessage(response.status),
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("delete-account-payable");

    return { successMessage: message };
  } catch (error) {
    logActionError("account-payable/delete-account-payable", error);
    return {
      deleteAccountPayableError:
        "Ocorreu um erro inesperado ao tentar deletar uma conta a pagar.",
    };
  }
};

export { handleDeleteAccountPayable };
