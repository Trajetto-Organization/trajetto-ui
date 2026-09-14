"use server";

import { getCookies } from "../../cookies";

interface DeleteShipperProps {
  businessId: string;
  shipperId: string;
}

interface DeleteShipperResponseProps {
  message: string;
}

const handleDeleteShipper = async ({
  businessId,
  shipperId,
}: DeleteShipperProps) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      deleteShipperError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const deleteShipper = `${process.env.HTTP_REQUEST}/shipper/delete-shipper/${shipperId}/business/${businessId}`;

  try {
    const response = await fetch(deleteShipper, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteShipperResponseProps;

    if (!response.ok && message) {
      return { deleteShipperError: message };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      deleteShipperError:
        "Ocorreu um erro inesperado ao tentar deletar o embarcador.",
    };
  }
};

export { handleDeleteShipper };
