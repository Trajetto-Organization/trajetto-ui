import { z } from "zod";
import {
  emptyStringToNull,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isValidDateString,
  parseCurrencyToNumber,
} from "@/lib/format-values";

const serviceOrderFieldsSchema = z.object({
  date: z
    .string()
    .min(1, "Data da ordem de serviço é obrigatória.")
    .superRefine((val, ctx) => {
      if (!isValidDateString(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data da ordem de serviço inválida",
        });

        return;
      }
    }),
  completion_date: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .transform((val) => (val && val.trim() !== "" ? val : null))
      .nullable()
      .optional()
      .refine(
        (val) => !val || isValidDateString(val),
        "Data de conclusão inválida",
      ),
  ),
  maintenance_type: z.enum(["INTERNAL", "EXTERNAL"], {
    // Nothing picked yet says what is missing (decision 16.702).
    errorMap: (_issue, ctx) => ({
      message:
        ctx.data === undefined || ctx.data === null || ctx.data === ""
          ? "Selecione o tipo de manutenção."
          : "Tipo de manutenção inválido. Deve ser Interna ou Externa",
    }),
  }),
  description: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .max(500, "A descrição deve ter no máximo 500 caracteres.")
      .superRefine((value, ctx) => {
        if (hasConsecutiveSpaces(value)) {
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
        }
      })
      .optional()
      .nullable(),
  ),
  total_amount: z.preprocess(
    parseCurrencyToNumber,
    z
      .number({
        required_error: "O valor total é obrigatório.",
        invalid_type_error: "O valor total deve ser um valor numérico válido.",
      })
      .nonnegative("O valor total deve ser um valor não negativo.")
      .min(1, "O valor total deve ser no mínimo R$ 1,00")
      .max(9999999.99, "O valor total não pode exceder R$ 9.999.999,99."),
  ),
  current_mileage_at_service: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }

      return val;
    },
    z
      .number({
        required_error: "A quilometragem atual do veículo é obrigatória.",
        invalid_type_error: "A quilometragem atual deve ser um número válido.",
      })
      .nonnegative("A quilometragem atual deve ser um valor não negativo.")
      .min(0.1, "A quilometragem atual deve ser maior que zero.")
      .max(9999999, "A quilometragem atual não pode exceder 9.999.999 km."),
  ),
  maintenance_interval_km_at_service: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }

      return val;
    },
    z
      .number({
        required_error: "O intervalo de revisão em km é obrigatório.",
        invalid_type_error:
          "O intervalo de revisão em km deve ser um número válido.",
      })
      .min(0.1, "O intervalo de revisão em km deve ser maior que zero.")
      .positive("O intervalo de revisão em km deve ser um valor positivo.")
      .max(100000, "O intervalo de revisão em km não pode exceder 100.000 km."),
  ),
  last_maintenance_mileage_at_service: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }

      return val;
    },
    z
      .number({
        required_error: "A quilometragem da última revisão é obrigatória.",
        invalid_type_error:
          "A quilometragem da última revisão deve ser um número válido.",
      })
      .nonnegative(
        "A quilometragem da última revisão deve ser um valor não negativo.",
      )
      .min(0.1, "A quilometragem da última revisão deve ser maior que zero.")
      .max(
        9999999,
        "A quilometragem da última revisão não pode exceder 9.999.999 km.",
      )
      // Optional, like the vehicle's own column: a vehicle's FIRST order
      // has no previous review, and for anyone but a MASTER the field is a
      // read-only copy of the vehicle — required, it blocked that order.
      .optional(),
  ),
  new_mileage_after_service: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return undefined;
        return parseFloat(val.replace(",", "."));
      }

      return val;
    },
    z
      .number({
        invalid_type_error: "A nova quilometragem deve ser um número válido.",
      })
      .nonnegative("A nova quilometragem deve ser um valor não negativo.")
      .min(0.1, "A nova quilometragem deve ser maior que zero.")
      .max(9999999, "A nova quilometragem não pode exceder 9.999.999 km.")
      .optional()
      .nullable(),
  ),
  vehicleId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID do veículo deve ser um UUID válido.")
      .optional()
      .nullable(),
  ),
  responsibleUserId: z
    .string()
    .uuid("O ID do usuário responsável deve ser um UUID válido."),

  branchId: z.string().uuid("O ID da filial deve ser um UUID válido."),
  supplierId: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .uuid("O ID do fornecedor deve ser um UUID válido.")
      .optional()
      .nullable(),
  ),

  // 📍 GEOLOCATION: Final location (edited or original)
  latitude: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return null;
        return parseFloat(val);
      }

      return val;
    },
    z
      .number({
        invalid_type_error: "A latitude deve ser um número válido.",
      })
      .min(-90, "A latitude deve estar entre -90 e 90.")
      .max(90, "A latitude deve estar entre -90 e 90.")
      .optional()
      .nullable(),
  ),
  longitude: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        if (val.trim() === "") return null;
        return parseFloat(val);
      }

      return val;
    },
    z
      .number({
        invalid_type_error: "A longitude deve ser um número válido.",
      })
      .min(-180, "A longitude deve estar entre -180 e 180.")
      .max(180, "A longitude deve estar entre -180 e 180.")
      .optional()
      .nullable(),
  ),
});

interface ServiceOrderCrossData {
  date?: string | null;
  completion_date?: string | null;
  current_mileage_at_service?: number | null;
  last_maintenance_mileage_at_service?: number | null;
  new_mileage_after_service?: number | null;
}

type ServiceOrderCrossIssues = Partial<
  Record<
    | "completion_date"
    | "last_maintenance_mileage_at_service"
    | "new_mileage_after_service",
    string
  >
>;

/**
 * The rules between fields, per field: the schema's refine and the form's
 * live rules say the same thing, and live they must not wait for every
 * other field to be valid (an object refine only runs once they all are).
 */
function serviceOrderCrossIssues(
  data: ServiceOrderCrossData,
): ServiceOrderCrossIssues {
  const issues: ServiceOrderCrossIssues = {};

  if (data.completion_date && data.date) {
    const orderDate = new Date(data.date);
    const completionDate = new Date(data.completion_date);

    if (completionDate < orderDate) {
      issues.completion_date =
        "A data de conclusão não pode ser anterior à data da ordem de serviço";
    }
  }

  if (
    data.last_maintenance_mileage_at_service &&
    data.current_mileage_at_service &&
    data.last_maintenance_mileage_at_service > data.current_mileage_at_service
  ) {
    issues.last_maintenance_mileage_at_service =
      "A quilometragem da última revisão não pode ser superior à quilometragem atual";
  }

  if (data.completion_date && !data.new_mileage_after_service) {
    issues.new_mileage_after_service =
      "A nova quilometragem é obrigatória quando a ordem de serviço é finalizada";
  }

  return issues;
}

/**
 * The same rules on the form's raw values (strings as typed): each field is
 * read through its own schema, and one that does not parse is left to its
 * own message.
 */
function serviceOrderLiveIssues(
  values: Record<string, string>,
): ServiceOrderCrossIssues {
  const shape = serviceOrderFieldsSchema.shape;
  const read = <K extends keyof typeof shape>(field: K) => {
    const result = shape[field].safeParse(values[field] ?? "");
    return result.success ? (result.data as never) : undefined;
  };

  return serviceOrderCrossIssues({
    date: read("date"),
    completion_date: read("completion_date"),
    current_mileage_at_service: read("current_mileage_at_service"),
    last_maintenance_mileage_at_service: read(
      "last_maintenance_mileage_at_service",
    ),
    new_mileage_after_service: read("new_mileage_after_service"),
  });
}

const createUpdateServiceOrderSchema = serviceOrderFieldsSchema.superRefine(
  (data, ctx) => {
    for (const [field, message] of Object.entries(
      serviceOrderCrossIssues(data),
    )) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  },
);

export {
  createUpdateServiceOrderSchema,
  serviceOrderCrossIssues,
  serviceOrderFieldsSchema,
  serviceOrderLiveIssues,
};
