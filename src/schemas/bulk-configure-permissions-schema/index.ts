import { z } from "zod";
import { permissions } from "@/lib/permissions";

const permissionKeyEnum = z.enum(
  Object.values(permissions) as [string, ...string[]],
);

const bulkConfigurePermissionsSchema = z.object({
  businessId: z.string().min(1, "A empresa é obrigatória."),
  profileAccessId: z.string().min(1, "O perfil de acesso é obrigatório."),
  permissions: z.array(
    z.object({
      permissionKey: permissionKeyEnum,
      canRead: z.boolean(),
      canWrite: z.boolean(),
    }),
  ),
});

export { bulkConfigurePermissionsSchema };
