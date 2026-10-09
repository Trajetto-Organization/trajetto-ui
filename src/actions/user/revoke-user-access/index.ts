"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface RevokeUserAccessProps {
  message: string;
}

const handleRevokeUserAccess = async (userId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      revokeAccessUserError:
        "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const revokeUserAccess = `${process.env.HTTP_REQUEST}/user/revoke-access/${userId}`;

  try {
    const response = await apiFetch(revokeUserAccess, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const { message } = (await response.json()) as RevokeUserAccessProps;

    if (!response.ok) {
      return {
        revokeAccessUserError: message || refusalMessage(response.status),
      };
    }

    return { successMessage: message };
  } catch (error) {
    logActionError("user/revoke-user-access", error);
    return {
      revokeAccessUserError:
        "Ocorreu um erro inesperado ao tentar revogar o acesso do usuário.",
    };
  }
};

export { handleRevokeUserAccess };
