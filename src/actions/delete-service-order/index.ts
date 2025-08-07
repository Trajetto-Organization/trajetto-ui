"use server";

import { getCookies } from "../cookies";

interface DeleteServiceOrderProps {
  businessId: string;
  serviceOrderId: string;
}

interface DeleteServiceOrderResponseProps {
  message: string;
}

const handleDeleteServiceOrder = async ({
  businessId,
  serviceOrderId,
}: DeleteServiceOrderProps) => {
  const deleteServiceOrder = `${process.env.HTTP_REQUEST}/service-order/delete-service-order/${serviceOrderId}/business/${businessId}`;
  const tokenAccess = await getCookies("tkey");

  try {
    const response = await fetch(deleteServiceOrder, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } =
      (await response.json()) as DeleteServiceOrderResponseProps;

    if (!response.ok && message) {
      return { deleteServiceOrderError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteServiceOrderError:
        "Ocorreu um erro inesperado ao tentar deletar a ordem de serviço.",
    };
  }
};

export { handleDeleteServiceOrder };
