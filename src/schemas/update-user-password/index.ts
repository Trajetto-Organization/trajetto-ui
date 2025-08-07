import { z } from "zod";

const validateUserPasswordFormSchema = z
  .object({
    current_password: z.string().superRefine((value, ctx) => {
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
    new_password: z.string().superRefine((value, ctx) => {
      if (/\s/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A senha não deve conter espaços",
          path: ["new_password"],
        });

        return;
      }

      if (value.length < 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A senha deve ter pelo menos 7 caracteres",
          path: ["new_password"],
        });

        return;
      }
    }),
    confirm_new_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "As senhas não coincidem",
    path: ["confirm_new_password"],
  });

export { validateUserPasswordFormSchema };
