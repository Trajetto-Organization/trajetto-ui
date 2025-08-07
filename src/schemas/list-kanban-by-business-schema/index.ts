import { z } from "zod";

const listKanbanByBusinessSchema = z.object({
  businessId: z.string().uuid("ID da empresa inválido."),
});

export { listKanbanByBusinessSchema };
