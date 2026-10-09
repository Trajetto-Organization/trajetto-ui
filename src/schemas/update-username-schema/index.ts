import { z } from "zod";

const validateUserNameFormSchema = z.object({
  // Empty or blank is a missing name (decision 16.702), checked first so
  // "   " does not read as "espaços consecutivos".
  userName: z
    .string()
    .regex(/\S/, "O nome é obrigatório.")
    .superRefine((value, ctx) => {
      if (value.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome não deve exceder 100 caracteres.",
        });

        return;
      }

      if (/\s{2,}/.test(value) && value.length !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome não deve conter espaços consecutivos.",
        });

        return;
      }

      if (!/^\S+ \S+(?: \S+)*$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Por favor, insira o nome completo.",
        });

        return;
      }
    }),
});

export { validateUserNameFormSchema };
