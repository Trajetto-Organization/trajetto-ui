import { z } from "zod";

const validateTwoFactorUserFormSchema = z.object({
  code: z
    .string()
    .min(
      6,
      "O código de verificação de dois fatores deve ter pelo menos 6 dígitos",
    )
    .max(
      6,
      "O código de verificação de dois fatores deve ter no máximo 6 dígitos",
    ),
});

export { validateTwoFactorUserFormSchema };
