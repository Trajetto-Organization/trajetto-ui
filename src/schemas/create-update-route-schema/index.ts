import { z } from "zod";

import {
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
} from "@/lib/format-values";

/**
 * Mirrors the API's route schemas, message for message, so a refusal reads the
 * same whether the browser or the server produced it.
 *
 * The name is the only free text a dispatcher types here — everything else is
 * an id or a date. `""` becomes `null` throughout, because that is what an
 * empty HTML input submits and the API distinguishes "leave it" (absent) from
 * "clear it" (null).
 */
const optionalName = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string()
    .max(80, "O nome da rota deve ter no máximo 80 caracteres.")
    .superRefine((value, ctx) => {
      if (isEmptyOrWhitespace(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da rota não pode conter apenas espaços.",
        });

        return;
      }

      if (hasConsecutiveSpaces(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O nome da rota não deve conter espaços consecutivos.",
        });

        return;
      }

      if (hasSpaceAtEdges(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "O nome da rota não pode começar ou terminar com espaço em branco.",
        });
      }
    })
    .nullable()
    .optional(),
);

const optionalDateTime = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().nullable().optional(),
);

const createUpdateRouteSchema = z.object({
  driverId: z
    .string({ required_error: "O motorista é obrigatório." })
    .uuid("O motorista deve ter um identificador válido."),

  /**
   * Optional while planning and required to release — the API refuses the
   * handover without one, because discovering at the truck that no vehicle
   * was assigned costs a phone call and a morning.
   */
  vehicleId: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .string()
      .uuid("O veículo deve ter um identificador válido.")
      .nullable()
      .optional(),
  ),

  name: optionalName,

  scheduled_date: z
    .string({ required_error: "A data da rota é obrigatória." })
    .min(1, "A data da rota é obrigatória."),

  planned_departure_at: optionalDateTime,
  planned_arrival_at: optionalDateTime,
});

/**
 * The cancellation reason is required, and not as ceremony: cancelling a route
 * that already left throws away a driver's morning, and the only way anyone
 * reconstructs why is if the person who did it said so at the time.
 */
const cancelRouteSchema = z.object({
  reason: z
    .string({ required_error: "Informe o motivo do cancelamento da rota." })
    .trim()
    .min(3, "O motivo deve ter no mínimo 3 caracteres.")
    .max(255, "O motivo deve ter no máximo 255 caracteres."),
});

export { cancelRouteSchema, createUpdateRouteSchema };
