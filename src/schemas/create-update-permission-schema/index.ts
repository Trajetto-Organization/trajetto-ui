import { z } from "zod";

import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";
import { EnumPermissionKey } from "@/app/(protected)/_components/shared/common.types";

const permissionKeyEnum = z.nativeEnum(EnumPermissionKey, {
  errorMap: () => ({ message: "A permissão é obrigatória." }),
});

const createUpdatePermissionSchema = z
  .object({
    action: z
      .string()
      .min(3, "O nome da permissão deve ter no mínimo 3 caracteres.")
      .superRefine((value, ctx) => {
        if (value.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "O nome da permissão não pode ser vazio ou conter apenas espaços.",
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
    businessId: z.string().min(1, "A empresa é obrigatória!"),
    profileAccessId: z.string().min(1, "O Perfil de acesso é obrigatório!"),
    permissionKey: permissionKeyEnum,
  })
  .refine((data) => data.canRead, {
    message: "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    path: ["canRead"],
  });

export { createUpdatePermissionSchema };
