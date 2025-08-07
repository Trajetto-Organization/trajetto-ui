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
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  });

export { validateResetUserPasswordFormSchema };
