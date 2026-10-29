import { z } from "zod";

import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";
import { permissionKeys } from "@/lib/permissions";

// Validates against the canonical key list, so a permission added there is
// immediately accepted here — no second list to remember.
const permissionKeyEnum = z.enum(permissionKeys, {
  errorMap: () => ({ message: "Selecione a permissão." }),
});

const createUpdatePermissionSchema = z
  .object({
    action: z
      .string()
      // Empty or blank is a missing name, not a short one (decision 16.702).
      .regex(/\S/, "O nome da permissão é obrigatório.")
      .min(3, "O nome da permissão deve ter no mínimo 3 caracteres.")
      .superRefine((value, ctx) => {
        if (value.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O nome da permissão é obrigatório.",
          });

          return;
        }

        if (value.length > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O nome da permissão não deve exceder 100 caracteres.",
          });

          return;
        }

        if (hasConsecutiveSpaces(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O nome da permissão não deve conter espaços consecutivos.",
          });

          return;
        }

        if (hasSpaceAtEdges(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O nome da permissão não pode começar ou terminar com espaço em branco.",
          });

          return;
        }

        const regex = /^(?=[\p{L}\p{N}])[ \p{L}\p{N}\p{P}]*(?<=[\p{L}\p{N}])$/u;
        if (!regex.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O nome da permissão deve começar e terminar com letra ou número; símbolos (ex.: @, _, -, .) só são permitidos no meio.",
          });
        }
      }),
    canRead: z.preprocess((val) => (val === "on" ? true : false), z.boolean()),
    canWrite: z.preprocess(
      (val) => (val === "on" ? true : false),
      z.boolean().default(false),
    ),
    businessId: z.string().min(1, "Selecione a empresa."),
    profileAccessId: z.string().min(1, "Selecione o perfil de acesso."),
    permissionKey: permissionKeyEnum,
  })
  .refine((data) => data.canRead, {
    message: "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    path: ["canRead"],
  });

export { createUpdatePermissionSchema };
