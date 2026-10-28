"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteServiceOrderProps {
  businessId: string;
  serviceOrderId: string;
}

interface DeleteServiceOrderResponseProps {
  message: string;
  /** Part lines removed with the order (their cascade). */
  partsRemoved?: number;
}

const handleDeleteServiceOrder = async ({
  businessId,
  serviceOrderId,
}: DeleteServiceOrderProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteServiceOrderError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteServiceOrder = `${process.env.HTTP_REQUEST}/service-order/delete-service-order/${serviceOrderId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteServiceOrder, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message, partsRemoved } =
      (await response.json()) as DeleteServiceOrderResponseProps;

    if (!response.ok) {
      return {
        deleteServiceOrderError:
          message ?? "Não foi possível excluir a ordem de serviço.",
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-service-order");

    return {
      successMessage:
        partsRemoved && partsRemoved > 0
          ? `${message} ${partsRemoved} peça(s) lançada(s) nela foram removidas junto.`
          : message,
    };
  } catch (error) {
    logActionError("service-order/delete-service-order", error);
    return {
      deleteServiceOrderError:
        "Ocorreu um erro inesperado ao tentar deletar a ordem de serviço.",
    };
  }
};

export { handleDeleteServiceOrder };
