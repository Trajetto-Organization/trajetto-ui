import { z } from "zod";

// The login's e-mail rule, message for message: "O e-mail é obrigatório" used
// to answer an address that was present but malformed.
const validateForgotFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "O e-mail é obrigatório.")
    .email("O e-mail informado não é válido.")
    .max(100, "O e-mail deve ter no máximo 100 caracteres."),
});

export { validateForgotFormSchema };
