import { z } from "zod";

const validateLoginUserFormSchema = z.object({
  // Trimmed before checking, here and in the action that parses it again: an
  // autocompleted address often arrives with a trailing space on a phone.
  email: z
    .string()
    .trim()
    .min(1, "O e-mail é obrigatório.")
    .email("O e-mail informado não é válido.")
    .max(100, "O e-mail deve ter no máximo 100 caracteres."),
  password: z
    .string()
    // Missing is said as missing, before the length rule (decision 16.702).
    .min(1, "A senha é obrigatória.")
    .min(7, "A senha deve ter pelo menos 7 caracteres.")
    .max(100, "A senha deve ter no máximo 100 caracteres."),
});

export { validateLoginUserFormSchema };
