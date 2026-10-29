import { z } from "zod";

const allowedFuelTypes = [
  "Gasolina",
  "Diesel",
  "Etanol",
  "GNV",
  "GLP",
  "Biodiesel",
  "Elétrico",
  "Hidrogênio",
] as const;

const createUpdateFuelTypeSchema = z.object({
  description: z.enum(allowedFuelTypes, {
    // Nothing picked yet says what is missing (decision 16.702).
    errorMap: (_issue, ctx) => ({
      message:
        ctx.data === undefined || ctx.data === null || ctx.data === ""
          ? "Selecione o combustível."
          : "Combustível inválido. Selecione uma opção válida.",
    }),
  }),
  businessId: z.string().min(1, "A empresa é obrigatória!"),
});

export { createUpdateFuelTypeSchema, allowedFuelTypes };
