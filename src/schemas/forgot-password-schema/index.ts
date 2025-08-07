import { z } from "zod";

const validateForgotFormSchema = z.object({
  email: z.string().email("O e-mail é obrigatório"),
});

export { validateForgotFormSchema };
