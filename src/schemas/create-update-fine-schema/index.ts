import { z } from "zod";

// Helper function to convert empty strings to null
const emptyStringToNull = (value: any) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
};

const hasSpaceAtEdges = (value: string) => /^\s|\s$/.test(value);
const hasConsecutiveSpaces = (value: string): boolean => /\s{2,}/.test(value);

// Helper function to clean and convert currency to number
const currencyToNumber = (value: any) => {
  if (typeof value === "string") {
    // Remove currency formatting and convert to number
    const cleanAmount = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleanAmount) || 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
};

const isValidDateString = (value: string): boolean => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

const createUpdateFineSchema = z.object({
  violation_date: z
    .string()
    .min(1, "Data da infração é obrigatória")
    .superRefine((val, ctx) => {
      if (!isValidDateString(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data da infração inválida",
        });

        return;
      }

      const violationDate = new Date(val);
      const today = new Date();

      today.setHours(23, 59, 59, 999); // Set to end of day for comparison

      if (violationDate > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data da infração não pode ser futura",
        });
      }
    }),
  due_date: z
    .string()
    .min(1, "Data de vencimento é obrigatória")
    .superRefine((val, ctx) => {
      if (!isValidDateString(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data de vencimento inválida",
        });
      }
    }),
  payment_date: z.preprocess(
    emptyStringToNull,
    z
      .string()
      .superRefine((val, ctx) => {
        if (val && !isValidDateString(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Data de pagamento inválida",
          });
        }
      })
      .nullable()
      .optional(),
  ),
  amount: z.preprocess(
    currencyToNumber,
    z
      .number()
      .positive("O valor da multa deve ser maior que zero")
      .max(999999.99, "O valor da multa não pode exceder R$ 999.999,99"),
  ),
  points: z.preprocess(
    (val) => {
      if (typeof val === "string" && val.trim() === "") {
        return "";
      }
      return val;
    },
    z
      .string()
      .min(1, "A pontuação é obrigatória")
      .refine((val) => {
        const number = parseInt(val, 10);
        return !isNaN(number) && number >= 0 && number <= 20;
      }, "A pontuação deve ser um número entre 0 e 20"),
  ),
  location: z
    .string()
    .max(200, "Local da infração deve ter no máximo 200 caracteres")
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === "") {
        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do local da infração não deve conter espaços consecutivos.",
        });
        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do local da infração não pode começar ou terminar com espaço em branco.",
        });
        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome do local da infração deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  observation: z
    .string()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === "") {
        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da observação não deve conter espaços consecutivos.",
        });
        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da observação não pode começar ou terminar com espaço em branco.",
        });
        return;
      }

      if (!/^[\p{L}0-9]+(?:[ \-][\p{L}0-9]+)*$/u.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da observação deve conter apenas letras (inclusive acentos), números, espaços e traços, sem outros caracteres.",
        });
      }
    }),
  branchId: z.string().uuid("ID da filial deve ser um UUID válido"),
  driverId: z.string().uuid("ID do motorista deve ser um UUID válido"),
  vehicleId: z.string().uuid("ID do veículo deve ser um UUID válido"),
  trafficViolationCodeId: z
    .string()
    .uuid("ID do código de infração deve ser um UUID válido"),

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

export { createUpdateFineSchema };
