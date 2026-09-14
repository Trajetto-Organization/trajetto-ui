import { z } from "zod";

const updateVehicleLimitSchema = z.object({
  vehicle_limit: z.coerce
    .number({
      invalid_type_error: "O limite deve ser um número válido.",
    })
    .int("O limite deve ser um número inteiro.")
    .min(0, "O limite não pode ser negativo.")
    .max(100000, "O limite não pode exceder 100.000 veículos."),
});

export { updateVehicleLimitSchema };
