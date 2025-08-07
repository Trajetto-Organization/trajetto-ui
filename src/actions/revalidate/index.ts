"use server";

import { revalidatePath, revalidateTag } from "next/cache";

const revalidatePathName = async (page: string) => {
  try {
    revalidatePath(page);
  } catch (error) {
    return {
      message: `
        Houve um erro ao revalidar a página! Por favor, atualize
        a página para ver as novas alterações.`,
    };
  }
};

const revalidateTagName = async (tag: string) => {
  try {
    revalidateTag(tag);
  } catch (error) {
    return {
      message: `
        Houve um erro ao revalidar os dados! Por favor, clique 
        em revalidar dados para ver as novas alterações.`,
    };
  }
};

const revalidateTags = async (tags: string[]) => {
  return Promise.all(tags.map((tag) => revalidateTagName(tag)));
};

export { revalidatePathName, revalidateTagName, revalidateTags };
