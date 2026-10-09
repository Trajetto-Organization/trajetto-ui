import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isValidDateString,
  stringToBoolean,
} from "@/lib/format-values";

const updateKanbanCardSchema = z.object({
  title: z
    .string()
    .min(1, "O título do card é obrigatório.")
    .max(100, "O título deve ter no máximo 100 caracteres.")
    .superRefine((value, ctx) => {
      // Only spaces is a missing title, not a spacing mistake (16.702).
      if (value.length > 0 && value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O título do card é obrigatório.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O título não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O título não pode começar ou terminar com espaço em branco.",
        });

        return;
      }
    })
    .optional(),
  description: z
    .string()
    .min(1, "A descrição é obrigatória.")
    .max(500, "A descrição deve ter no máximo 500 caracteres.")
    .superRefine((value, ctx) => {
      if (value.length > 0 && value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A descrição é obrigatória.",
        });

        return;
      }

      if (/ {2,}/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A descrição não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A descrição não pode começar ou terminar com espaço em branco.",
        });

        return;
      }
    })
    .optional(),
  priority: z
    .enum(["low", "medium", "high", "urgent"], {
      errorMap: () => ({
        message: "Prioridade inválida. Use: baixa, média, alta ou urgente.",
      }),
    })
    .optional(),
  dueDate: z
    .string()
    .min(1, "A data de vencimento é obrigatória.")
    .superRefine((val, ctx) => {
      if (!isValidDateString(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data de vencimento inválida.",
        });

        return;
      }
    })
    .optional(),
  assignedUserId: z.preprocess(
    emptyStringToNull,
    z.string().uuid("ID do usuário inválido.").nullable().optional(),
  ),
  completed: z.preprocess(stringToBoolean, z.boolean().optional()),
});

export { updateKanbanCardSchema };
