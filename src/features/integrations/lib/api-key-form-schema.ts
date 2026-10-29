import { z } from "zod";

import type { ApiScope } from "@/actions/integration";
import { hasConsecutiveSpaces } from "@/lib/format-values";

import {
  MIN_API_KEY_RATE,
  apiKeyRateCeiling,
  type IntegrationsMode,
} from "./api-key-limits";

/**
 * The "Nova chave de API" form, mirrored from the API
 * (trajetto-api src/schemas/integration-schema: createApiKeySchema).
 *
 * The rate field was an `<input type="number">`: the browser accepted `--`,
 * `++` and `e`, handed over an empty string, and `Number("") || 120` issued a
 * key at 120 a minute that nobody had typed. A decimal passed here and came
 * back from the API in English (DLVB-20). The field now takes digits only,
 * empty means the documented default, and every rule is said under the field.
 */
const DEFAULT_API_KEY_RATE = 120;

/** Four digits is the platform ceiling (6000); more can only be a typo. */
const API_KEY_RATE_MAX_DIGITS = 4;

/** What the rate field keeps of whatever was typed or pasted. */
const digitsOnly = (value: string): string =>
  value.replace(/\D/g, "").slice(0, API_KEY_RATE_MAX_DIGITS);

// Mirrors the API's grantable scopes: `webhooks:manage` is still reserved.
const API_SCOPE_VALUES = [
  "deliveries:read",
  "deliveries:write",
  "routes:read",
  "events:read",
] as const;

function apiKeyFormSchema(mode: IntegrationsMode) {
  const ceiling = apiKeyRateCeiling(mode);

  return z.object({
    name: z
      .string()
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .min(
            2,
            "Dê um nome à chave, com pelo menos dois caracteres — quem revoga precisa reconhecer qual é.",
          )
          .max(80, "O nome da chave deve ter no máximo 80 caracteres.")
          .refine(
            (value) => !hasConsecutiveSpaces(value),
            "O nome da chave não pode ter espaços consecutivos.",
          ),
      ),

    scopes: z
      .array(z.enum(API_SCOPE_VALUES))
      .min(1, "Escolha ao menos um escopo."),

    // Optional: empty sends nothing and the API applies its default.
    rate_limit_per_minute: z
      .string()
      .transform((value) => value.trim())
      .pipe(
        z
          .string()
          .regex(
            /^\d*$/,
            "Use só números inteiros, sem sinais nem casas decimais.",
          )
          .transform((value) => (value === "" ? undefined : Number(value)))
          .pipe(
            z
              .number()
              .int("Use só números inteiros, sem sinais nem casas decimais.")
              .min(
                MIN_API_KEY_RATE,
                `O limite mínimo é de ${MIN_API_KEY_RATE} requisições por minuto.`,
              )
              .max(
                ceiling,
                mode === "admin"
                  ? `O limite por chave vai até ${ceiling.toLocaleString("pt-BR")} requisições por minuto.`
                  : `O limite por chave vai até ${ceiling.toLocaleString("pt-BR")} requisições por minuto. Acima disso, fale com o suporte.`,
              )
              .optional(),
          ),
      ),
  });
}

type ApiKeyFormInput = {
  name: string;
  scopes: ApiScope[];
  rate_limit_per_minute: string;
};

type ApiKeyFormErrors = Partial<
  Record<"name" | "scopes" | "rate_limit_per_minute", string>
>;

type ApiKeyPayload = {
  name: string;
  scopes: ApiScope[];
  rate_limit_per_minute?: number;
};

function validateApiKeyForm(
  input: ApiKeyFormInput,
  mode: IntegrationsMode,
):
  | { values: ApiKeyPayload; errors: null }
  | { values: null; errors: ApiKeyFormErrors } {
  const parsed = apiKeyFormSchema(mode).safeParse(input);

  if (parsed.success) {
    const { rate_limit_per_minute, ...rest } = parsed.data;

    return {
      values: {
        ...rest,
        ...(rate_limit_per_minute === undefined
          ? {}
          : { rate_limit_per_minute }),
      },
      errors: null,
    };
  }

  const errors: ApiKeyFormErrors = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ApiKeyFormErrors;

    if (field && !errors[field]) errors[field] = issue.message;
  }

  return { values: null, errors };
}

export {
  API_KEY_RATE_MAX_DIGITS,
  DEFAULT_API_KEY_RATE,
  apiKeyFormSchema,
  digitsOnly,
  validateApiKeyForm,
};
export type { ApiKeyFormErrors, ApiKeyFormInput, ApiKeyPayload };
