import { z } from "zod";
import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";

const updateMasterUserSchema = z.object({
  // Trimmed, as the user dialog's: the action sends the parsed (trimmed) value.
  email: z
    .string()
    .trim()
    .min(1, "O e-mail é obrigatório.")
    .email("O e-mail informado não é válido.")
    .max(100, "O e-mail deve ter no máximo 100 caracteres."),
  name: z.string().superRefine((value, ctx) => {
    // Missing is said as missing (decision 16.702).
    if (value.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome é obrigatório.",
      });

      return;
    }

    if (value.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome de usuário não deve exceder 100 caracteres.",
      });

      return;
    }

    if (hasConsecutiveSpaces(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome de usuário não deve conter espaços consecutivos.",
      });

      return;
    }

    if (hasSpaceAtEdges(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "O nome de usuário não pode começar ou terminar com espaço em branco.",
      });

      return;
    }

    if (!/^\S+ \S+(?: \S+)*$/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, insira o nome de usuário completo.",
      });

      return;
    }

    const regex = /^(?=[\p{L}\p{N}])[ \p{L}\p{N}\p{P}]*(?<=[\p{L}\p{N}])$/u;
    if (!regex.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "O nome de usuário deve começar e terminar com letra ou número; símbolos (ex.: @, _, -, .) só são permitidos no meio.",
      });
    }
  }),
  // Decision 4.9: a single-use link, never a typed password.
  sendPasswordSetupLink: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

export { updateMasterUserSchema };
