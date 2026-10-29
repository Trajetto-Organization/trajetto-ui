import { z } from "zod";

import { siteConfig } from "@/lib/site";

/**
 * The contact form has no server side: it only opens the person's mail
 * program with the message filled in (privacy policy §3). This is the whole
 * of its logic, kept apart from the component so it can be tested as is.
 */

const CONTACT_EMAIL = siteConfig.email;

/** Per-field limits; the fields carry them as maxlength too. */
const CONTACT_LIMITS = {
  firstName: 60,
  lastName: 60,
  subject: 150,
  message: 1_000,
} as const;

/**
 * Longest mailto link handed to the mail program. Windows and common desktop
 * clients drop or refuse links past about 2,000 characters, and then nothing
 * opens at all. Encoding inflates the text (an "ç" becomes six characters),
 * so the per-field limits alone cannot promise this.
 */
const MAILTO_MAX_LENGTH = 2_000;

const contactFields = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Informe o seu nome.")
    .max(
      CONTACT_LIMITS.firstName,
      `O nome deve ter no máximo ${CONTACT_LIMITS.firstName} caracteres.`,
    ),
  lastName: z
    .string()
    .trim()
    .max(
      CONTACT_LIMITS.lastName,
      `O sobrenome deve ter no máximo ${CONTACT_LIMITS.lastName} caracteres.`,
    ),
  subject: z
    .string()
    .trim()
    .min(1, "Informe o assunto.")
    .max(
      CONTACT_LIMITS.subject,
      `O assunto deve ter no máximo ${CONTACT_LIMITS.subject} caracteres.`,
    ),
  message: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem.")
    .max(
      CONTACT_LIMITS.message,
      `A mensagem deve ter no máximo ${CONTACT_LIMITS.message} caracteres.`,
    ),
});

type ContactMessageInput = z.input<typeof contactFields>;
type ContactMessage = z.output<typeof contactFields>;
type ContactField = keyof ContactMessageInput;
type ContactMessageErrors = Partial<Record<ContactField, string[]>>;

/** RFC 6068 asks for CRLF line breaks in a mailto body. */
function withCrlf(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

/**
 * Every parameter goes through encodeURIComponent: an unencoded "&" ended
 * the subject early and a "#" turned the rest of the link, body included,
 * into a fragment the mail program never saw.
 */
function buildContactMailto({
  firstName,
  lastName,
  subject,
  message,
}: ContactMessage): string {
  const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  const body = withCrlf(`Olá, meu nome é ${name}.\n\n${message.trim()}`);

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
}

const contactMessageSchema = contactFields.superRefine((data, ctx) => {
  // A field over its own limit already says so; one message per field.
  const overLimit = (Object.keys(CONTACT_LIMITS) as ContactField[]).some(
    (field) => data[field].length > CONTACT_LIMITS[field],
  );
  if (overLimit) return;

  if (buildContactMailto(data).length > MAILTO_MAX_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["message"],
      message:
        "A mensagem ficou longa demais para abrir no seu programa de e-mail. Encurte o texto.",
    });
  }
});

export {
  CONTACT_EMAIL,
  CONTACT_LIMITS,
  MAILTO_MAX_LENGTH,
  buildContactMailto,
  contactMessageSchema,
};
export type {
  ContactField,
  ContactMessage,
  ContactMessageErrors,
  ContactMessageInput,
};
