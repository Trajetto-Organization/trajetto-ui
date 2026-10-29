import { z } from "zod";
import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";

const createUpdateProfileAccessSchema = z.object({
  name: z
    .string()
    // Empty or blank is a missing name, not a short one (decision 16.702).
    .regex(/\S/, "O nome do perfil é obrigatório.")
    .min(3, "O nome do perfil deve ter no mínimo 3 caracteres.")
    .superRefine((value, ctx) => {
      if (value.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome do perfil é obrigatório.",
        });

        return;
      }

      if (value.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do perfil de acesso não deve exceder 100 caracteres.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do perfil de acesso não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do perfil de acesso não pode começar ou terminar com espaço em branco.",
        });

        return;
      }

      const regex = /^(?=[\p{L}\p{N}])[ \p{L}\p{N}\p{P}]*(?<=[\p{L}\p{N}])$/u;
      if (!regex.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do perfil de acesso deve começar e terminar com letra ou número; símbolos (ex.: @, _, -, .) só são permitidos no meio.",
        });
      }
    }),
  businessId: z.string().min(1, "Selecione a empresa."),
});

export { createUpdateProfileAccessSchema };
