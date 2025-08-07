"use server";

import { revalidateTagName, revalidateTags } from "../revalidate";

const handleRevalidateData = async (revalidateData: string | string[]) => {
  try {
    // If an array of strings comes in, we call revalidateTags
    if (Array.isArray(revalidateData)) {
      await revalidateTags(revalidateData);
    } else {
      await revalidateTagName(revalidateData);
    }
  } catch (error) {
    return {
      revalidateDataError:
        "Ocorreu um erro inesperado ao tentar fazer a revalidação dos dados! Por favor, tente novamente.",
    };
  }
};

export { handleRevalidateData };
