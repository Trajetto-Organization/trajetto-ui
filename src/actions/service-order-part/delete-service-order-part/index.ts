"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface DeleteServiceOrderPartProps {
  businessId: string;
  serviceOrderPartId: string;
  serviceOrderId: string;
}

interface DeleteServiceOrderPartResponseProps {
  message: string;
}

const handleDeleteServiceOrderPart = async ({
  businessId,
  serviceOrderPartId,
  serviceOrderId,
}: DeleteServiceOrderPartProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteServiceOrderPartError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteServiceOrderPart = `${process.env.HTTP_REQUEST}/service-order-part/delete-service-order-part/${serviceOrderPartId}/serviceOrder/${serviceOrderId}/business/${businessId}`;

  try {
    const response = await apiFetch(deleteServiceOrderPart, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteServiceOrderPartResponseProps;

    if (!response.ok) {
      return {
        deleteServiceOrderPartError: message || refusalMessage(response.status),
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-service-order-part");

    return { successMessage: message };
  } catch (error) {
    logActionError("service-order-part/delete-service-order-part", error);
    return {
      deleteServiceOrderPartError:
        "Ocorreu um erro inesperado ao tentar deletar a ordem de serviço da peça.",
    };
  }
};

export { handleDeleteServiceOrderPart };
