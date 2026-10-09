"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

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
    const response = await apiFetch(deleteShipper, {
      credentials: "include",
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as DeleteShipperResponseProps;

    if (!response.ok) {
      return { deleteShipperError: message || refusalMessage(response.status) };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("shipper/delete-shipper", error);
    return {
      deleteShipperError:
        "Ocorreu um erro inesperado ao tentar deletar o embarcador.",
    };
  }
};

export { handleDeleteShipper };
