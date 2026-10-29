"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { revalidateTagName } from "@/actions/revalidate";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ToggleBusinessActiveResponse {
  message: string;
  is_active?: boolean;
}

const handleToggleBusinessActive = async (businessId: string) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      toggleError: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const toggleUrl = `${process.env.HTTP_REQUEST}/business/toggle-business-active/${businessId}`;

  try {
    const response = await apiFetch(toggleUrl, {
      credentials: "include",
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
      },
    });

    const data = (await response.json()) as ToggleBusinessActiveResponse;

    if (!response.ok) {
      return { toggleError: data.message || refusalMessage(response.status) };
    }

    revalidateTagName("toggle-business-active")
      .then((result) => {
        return {
          toggleError: result?.message,
        };
      })
      .catch((error) => {
        return {
          toggleError: error.message,
        };
      });

    return {
      successMessage: data.message,
      is_active: data.is_active,
    };
  } catch (error) {
    logActionError("business/toggle-business-active", error);
    return {
      toggleError:
        "Ocorreu um erro inesperado ao tentar alterar o status da empresa.",
    };
  }
};

export { handleToggleBusinessActive };
