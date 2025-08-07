"use server";

import { createUpdateBusinessFormSchema } from "@/schemas/create-update-business-schema";
import { getCookies } from "../cookies";

interface CreateBusinessProps {
  message: string;
}

const handleCreateBusiness = async (
  state: any,
  createBusinessValues: FormData,
) => {
  if (createBusinessValues.type === "RESET") {
    return {};
  }

  const createBusiness = `${process.env.HTTP_REQUEST}/business/create-business`;
  const tokenAccess = await getCookies("tkey");

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
    const response = await fetch(createBusiness, {
      credentials: "include",
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(businessData),
    });

    const { message } = (await response.json()) as CreateBusinessProps;

    if (!response.ok && message) {
      return {
        createBusinessError: { createBusinessErrorMessage: message },
      };
    }

    return { successMessage: message };
  } catch (error) {
    return {
      createBusinessError: {
        createBusinessErrorMessage:
          "Ocorreu um erro inesperado ao tentar criar a empresa.",
      },
    };
  }
};

export { handleCreateBusiness };
