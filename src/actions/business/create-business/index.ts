"use server";

import { refusalMessage } from "@/lib/api-error";
import { logActionError } from "@/lib/log-action-error";
import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface CreateBusinessProps {
  message: string;
}

const handleCreateBusiness = async (
  state: any,
  createBusinessValues: FormData,
) => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      createBusinessError: {
        createBusinessErrorMessage:
          "Token de acesso não encontrado. Faça login novamente.",
      },
    };
  }

  if (createBusinessValues.type === "RESET") {
    return {};
  }

  const createBusiness = `${process.env.HTTP_REQUEST}/business/create-business`;

  const businessValues = Object.fromEntries(createBusinessValues.entries());
  const createBusinessValidation =
    createUpdateBusinessFormSchema.safeParse(businessValues);

  if (createBusinessValidation.error) {
    const formatError = createBusinessValidation.error.flatten();

    return {
      createBusinessError: formatError.fieldErrors,
    };
  }

  const businessData = createBusinessValidation.data;

  try {
    const response = await apiFetch(createBusiness, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessData),
    });

    const { message } = (await response.json()) as CreateBusinessProps;

    if (!response.ok) {
      return {
        createBusinessError: {
          createBusinessErrorMessage:
            message || refusalMessage(response.status),
        },
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("create-business");

    return { successMessage: message };
  } catch (error) {
    logActionError("business/create-business", error);
    return {
      createBusinessError: {
        createBusinessErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a empresa.",
      },
    };
  }
};

export { handleCreateBusiness };
