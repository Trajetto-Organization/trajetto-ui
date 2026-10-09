"use server";

import { logActionError } from "@/lib/log-action-error";
import { revalidateTag } from "next/cache";

import { toAllowedTags } from "@/lib/revalidation-tags";

// No `revalidatePath` action: it had no caller, and an exported server action
// is an endpoint whether anyone in the app uses it or not.

const REFUSED = {
  message: "Não foi possível revalidar estes dados.",
};

const revalidateTagName = async (tag: string) => {
  // Validated here and not only in `revalidateTags`: each exported function
  // of a "use server" file is its own endpoint.
  const tags = toAllowedTags(tag);

  if (!tags) return REFUSED;

  try {
    revalidateTag(tags[0]);
  } catch (error) {
    logActionError("revalidate", error);
    return {
      message: `
        Houve um erro ao revalidar os dados! Por favor, clique
        em revalidar dados para ver as novas alterações.`,
    };
  }
};

const revalidateTags = async (tags: string[]) => {
  const allowed = toAllowedTags(tags);

  if (!allowed) return [REFUSED];

  return Promise.all(allowed.map((tag) => revalidateTagName(tag)));
};

export { revalidateTagName, revalidateTags };
