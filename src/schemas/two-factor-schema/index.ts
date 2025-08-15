import { z } from "zod";

const validateTwoFactorUserFormSchema = z.object({
  code: z
    .string()
    .regex(
      /^\d{6}$/,
      "O código de verificação deve conter exatamente 6 dígitos numéricos.",
    ),
});

export { validateTwoFactorUserFormSchema };
