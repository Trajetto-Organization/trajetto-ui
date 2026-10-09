/**
 * The "Novo atendimento" form's rules, mirrored from the API's schema
 * (support-ticket-schema): a subject of 3 to 160 characters, an optional
 * first message up to 2,000. Said before the request, in the same words.
 *
 * About a delivery or a route (design §6.1) the API names the ticket itself
 * ("Entrega — Fulano", "Rota 12"), so the subject is asked only for a
 * general one; the delivery or the route must then be chosen.
 */
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 160;
const MESSAGE_MAX = 2000;

type NewTicketAbout = "GENERAL" | "DELIVERY" | "ROUTE";

interface NewTicketForm {
  subject: string;
  message: string;
  /** Omitted: a general ticket (the form before the pickers). */
  about?: NewTicketAbout;
  deliveryId?: string;
  routeId?: string;
}

interface NewTicketProblems {
  subject: string | null;
  message: string | null;
  context: string | null;
}

const NEW_TICKET_ABOUT_OPTIONS: Array<{
  value: NewTicketAbout;
  label: string;
}> = [
  { value: "GENERAL", label: "Assunto geral" },
  { value: "DELIVERY", label: "Uma entrega" },
  { value: "ROUTE", label: "Uma rota" },
];

function subjectProblem(raw: string): string | null {
  const subject = raw.trim();

  if (subject.length === 0) return "Informe o assunto do atendimento.";
  if (subject.length < SUBJECT_MIN)
    return `O assunto deve ter ao menos ${SUBJECT_MIN} caracteres.`;
  if (subject.length > SUBJECT_MAX)
    return `O assunto deve ter no máximo ${SUBJECT_MAX} caracteres.`;

  return null;
}

function newTicketProblems(input: NewTicketForm): NewTicketProblems {
  const about = input.about ?? "GENERAL";

  return {
    subject: about === "GENERAL" ? subjectProblem(input.subject) : null,
    message:
      input.message.trim().length > MESSAGE_MAX
        ? `A mensagem deve ter no máximo ${MESSAGE_MAX} caracteres.`
        : null,
    context:
      about === "DELIVERY" && !input.deliveryId
        ? "Escolha a entrega do atendimento."
        : about === "ROUTE" && !input.routeId
          ? "Escolha a rota do atendimento."
          : null,
  };
}

/** What the form sends to POST /chat/tickets besides the driver and the message. */
function newTicketTarget(
  input: NewTicketForm,
): { subject: string } | { deliveryId: string } | { routeId: string } {
  const about = input.about ?? "GENERAL";

  if (about === "DELIVERY" && input.deliveryId)
    return { deliveryId: input.deliveryId };
  if (about === "ROUTE" && input.routeId) return { routeId: input.routeId };

  return { subject: input.subject.trim() };
}

export {
  newTicketProblems,
  newTicketTarget,
  NEW_TICKET_ABOUT_OPTIONS,
  SUBJECT_MIN,
  SUBJECT_MAX,
  MESSAGE_MAX,
};
export type { NewTicketAbout, NewTicketForm, NewTicketProblems };
