import { z } from "zod";

import { hasConsecutiveSpaces } from "@/lib/format-values";

/**
 * The webhook form's rules, mirrored from the API
 * (trajetto-api src/schemas/integration-schema: saveWebhookEndpointSchema).
 *
 * The API stays the authority — its refusals are shown as they come — but
 * every rule a person can break by typing is said under the field before the
 * round trip: the name's text rules, https, the length, credentials in the
 * URL and an address that can never be reached.
 */
const WEBHOOK_URL_MAX_LENGTH = 2048;

/** Up to 10 per company, paused ones included (the API's 409 otherwise). */
const MAX_WEBHOOK_ENDPOINTS = 10;

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal"];
const BLOCKED_NAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

function isPrivateIPv4(host: string): boolean {
  const parts = host.split(".");

  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }

  const [a, b] = parts.map(Number);

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** The IPv4 carried in two hex groups: `a00:5` is 10.0.0.5. */
function embeddedIPv4(high: string, low: string): string {
  const h = parseInt(high, 16);
  const l = parseInt(low, 16);

  return `${h >> 8}.${h & 255}.${l >> 8}.${l & 255}`;
}

/**
 * The hostname as the URL parser leaves it: compressed, lowercase, a dotted
 * IPv4 tail already turned into two hex groups (`::ffff:8.8.8.8` arrives as
 * `::ffff:808:808`). Only ranges the API also refuses; anything else is the
 * API's call.
 */
function isPrivateIPv6(host: string): boolean {
  const value = host.toLowerCase();

  // Mapped and translated IPv4: judged as the IPv4 they carry, like the API.
  // Refusing every `::ffff:` refused public addresses the API accepts.
  const mapped = value.match(/^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);

  if (mapped) return isPrivateIPv4(embeddedIPv4(mapped[1], mapped[2]));

  return (
    // ::/96: unspecified, loopback and the IPv4-compatible form.
    /^::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})?)?$/.test(value) ||
    /^f[cd][0-9a-f]{2}:/.test(value) ||
    /^fe[89ab][0-9a-f]:/.test(value)
  );
}

/**
 * A host that is never a customer, judged without DNS — the same part the API
 * checks at save. A public name resolving to an internal address is still the
 * API's to refuse, on every send.
 */
function isUnreachableHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "");

  if (BLOCKED_NAMES.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  return host.includes(":") ? isPrivateIPv6(host) : isPrivateIPv4(host);
}

const webhookFormSchema = z.object({
  // Trimmed rather than refused at the edges: a stray space from a paste is
  // not worth a message, and the API receives the trimmed value.
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(2, "Dê um nome ao endpoint, com pelo menos dois caracteres.")
        .max(80, "O nome deve ter no máximo 80 caracteres.")
        .refine(
          (value) => !hasConsecutiveSpaces(value),
          "O nome não pode ter espaços consecutivos.",
        ),
    ),

  url: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, "Informe o endereço que vai receber os eventos.")
        .max(
          WEBHOOK_URL_MAX_LENGTH,
          "A URL deve ter no máximo 2.048 caracteres.",
        )
        .superRefine((value, ctx) => {
          let parsed: URL;

          try {
            parsed = new URL(value);
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Isso não é um endereço. Exemplo: https://erp.exemplo.com.br/eventos",
            });
            return;
          }

          if (parsed.protocol !== "https:") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Só https. Em http os eventos trafegam abertos no caminho.",
            });
            return;
          }

          if (parsed.username || parsed.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "A URL não pode conter usuário e senha. Use um cabeçalho de autenticação.",
            });
            return;
          }

          if (isUnreachableHost(parsed.hostname)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                "Precisa ser um endereço alcançável pela internet. Para testar na sua máquina, use um túnel https (cloudflared, ngrok).",
            });
          }
        }),
    ),

  topics: z.array(z.string()).min(1, "Escolha ao menos um evento para enviar."),

  is_active: z.boolean(),
});

type WebhookFormInput = z.input<typeof webhookFormSchema>;
type WebhookFormValues = z.output<typeof webhookFormSchema>;
type WebhookFormErrors = Partial<Record<"name" | "url" | "topics", string>>;

/** The first message per field, or the parsed values. */
function validateWebhookForm(
  input: WebhookFormInput,
):
  | { values: WebhookFormValues; errors: null }
  | { values: null; errors: WebhookFormErrors } {
  const parsed = webhookFormSchema.safeParse(input);

  if (parsed.success) return { values: parsed.data, errors: null };

  const errors: WebhookFormErrors = {};

  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof WebhookFormErrors;

    if (field && !errors[field]) errors[field] = issue.message;
  }

  return { values: null, errors };
}

export {
  MAX_WEBHOOK_ENDPOINTS,
  WEBHOOK_URL_MAX_LENGTH,
  isUnreachableHost,
  validateWebhookForm,
  webhookFormSchema,
};
export type { WebhookFormErrors, WebhookFormInput, WebhookFormValues };
