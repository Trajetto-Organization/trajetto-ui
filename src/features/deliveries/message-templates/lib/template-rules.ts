import { hasConsecutiveSpaces, hasSpaceAtEdges } from "@/lib/format-values";

import { TEMPLATE_VARIABLES } from "./catalogue";

/**
 * The customer-message rules the form checks before saving (DLV-MSG-2),
 * mirrored from the API (delivery-message-template-schema and
 * save-message-template-usecase) with the same sentences. The API remains
 * the authority: it parses the template with Handlebars, which also refuses
 * blocks and helpers this pre-check does not look for.
 */

const AVAILABLE = TEMPLATE_VARIABLES.map((name) => `{{${name}}}`).join(", ");

/** `{{ gabriel }}` names `gabriel`: spaces inside the braces are ignored. */
const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

function unknownVariables(text: string): string[] {
  const known = new Set<string>(TEMPLATE_VARIABLES);
  const unknown = new Set<string>();

  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1];

    if (!known.has(name)) unknown.add(name);
  }

  return [...unknown];
}

function unknownVariablesError(text: string): string | null {
  const unknown = unknownVariables(text);

  if (unknown.length === 0) return null;

  return `A mensagem usa variáveis que não existem: ${unknown
    .map((name) => `{{${name}}}`)
    .join(", ")}. Use apenas: ${AVAILABLE}.`;
}

function templateBodyError(
  body: string,
  channel: "EMAIL" | "WHATSAPP",
): string | null {
  if (body.trim().length < 10) {
    return "O texto da mensagem deve ter no mínimo 10 caracteres.";
  }

  const unknown = unknownVariablesError(body);

  if (unknown) return unknown;

  if (
    channel === "WHATSAPP" &&
    ![...body.matchAll(PLACEHOLDER)].some(
      (match) => match[1] === "link_descadastro",
    )
  ) {
    return "A mensagem de WhatsApp precisa incluir {{link_descadastro}}, para que o destinatário possa parar de receber.";
  }

  return null;
}

function templateSubjectError(subject: string): string | null {
  if (subject === "") return null;

  if (hasConsecutiveSpaces(subject)) {
    return "O assunto não deve conter espaços consecutivos.";
  }

  if (hasSpaceAtEdges(subject)) {
    return "O assunto não pode começar ou terminar com espaço em branco.";
  }

  return unknownVariablesError(subject);
}

/**
 * The body with `token` placed over the selection, or null when it would not
 * fit under `limit`: cutting it would leave a broken `{{link_desc`, which the
 * save then refuses as a syntax error.
 */
function insertToken(
  body: string,
  start: number,
  end: number,
  token: string,
  limit: number,
): string | null {
  const next = `${body.slice(0, start)}${token}${body.slice(end)}`;

  return next.length > limit ? null : next;
}

interface TemplateDraft {
  subject: string;
  body: string;
  is_active: boolean;
}

/** Whether an existing template changed; a new one is always savable. */
function isTemplateDirty(
  saved: { subject: string | null; body: string; is_active: boolean } | null,
  draft: TemplateDraft,
): boolean {
  if (!saved) return true;

  return (
    (saved.subject ?? "") !== draft.subject ||
    saved.body !== draft.body ||
    saved.is_active !== draft.is_active
  );
}

export {
  insertToken,
  isTemplateDirty,
  templateBodyError,
  templateSubjectError,
  unknownVariables,
};
