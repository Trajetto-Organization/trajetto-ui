import { z } from "zod";

const validateResetUserPasswordFormSchema = z
  .object({
    password: z.string().superRefine((value, ctx) => {
      if (/\s/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A senha não deve conter espaços",
          path: ["password"],
        });

        return;
      }

      if (value.length < 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A senha deve ter pelo menos 7 caracteres",
          path: ["password"],
        });

        return;
      }
    }),
    // Empty is its own message: two empty fields "matched", and a filled
    // password with an empty confirmation read as a mismatch.
    confirm_password: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });

export { validateResetUserPasswordFormSchema };
