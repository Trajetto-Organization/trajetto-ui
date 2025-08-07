"use server";

import { getCookies } from "../cookies";

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
  const deleteServiceOrderPart = `${process.env.HTTP_REQUEST}/service-order-part/delete-service-order-part/${serviceOrderPartId}/serviceOrder/${serviceOrderId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteServiceOrderPart, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteServiceOrderPartResponseProps;

    if (!response.ok && message) {
      return { deleteServiceOrderPartError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteServiceOrderPartError:
        "Ocorreu um erro inesperado ao tentar deletar a ordem de serviço da peça.",
    };
  }
};

export { handleDeleteServiceOrderPart };
