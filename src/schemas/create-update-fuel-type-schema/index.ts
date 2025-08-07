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
    errorMap: () => ({
      message: "Combustível inválido. Selecione uma opção válida.",
    }),
  }),
  businessId: z.string().min(1, "A empresa é obrigatória!"),
});

export { createUpdateFuelTypeSchema, allowedFuelTypes };
