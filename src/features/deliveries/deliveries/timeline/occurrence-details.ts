import type { DeliveryOccurrenceDetail } from "@/actions/delivery/get-delivery";

import { labelledAnswers } from "../../occurrence-types/form-builder/builder-rules";

/**
 * What an occurrence line of the history adds under its title: the driver's
 * answers to the type's form (decision 6.2) and the tower's say (6.3).
 *
 * Joined to the timeline by id (an OCCURRENCE entry's id is the occurrence's),
 * so the API's merged trail stays the one list and this only decorates it.
 */

type AuthorizationTone = "pending" | "approved" | "denied" | "superseded";

interface OccurrenceLineDetail {
  answers: Array<{ key: string; label: string; value: string }>;
  authorization: {
    tone: AuthorizationTone;
    /** One sentence, already in Portuguese. */
    label: string;
    note: string | null;
  } | null;
}

function authorizationOf(
  occurrence: DeliveryOccurrenceDetail,
): OccurrenceLineDetail["authorization"] {
  const who = occurrence.authorizedBy?.name;

  switch (occurrence.authorization_status) {
    case "PENDING":
      return {
        tone: "pending",
        label: occurrence.escalated_at
          ? "Aguardando autorização da torre (escalado aos administradores)"
          : "Aguardando autorização da torre",
        note: null,
      };

    case "APPROVED":
      return {
        tone: "approved",
        label: who ? `Autorizada por ${who}` : "Autorizada",
        note: occurrence.authorization_note ?? null,
      };

    case "DENIED":
      return {
        tone: "denied",
        label: who ? `Negada por ${who}` : "Negada",
        note: occurrence.authorization_note ?? null,
      };

    case "SUPERSEDED":
      return {
        tone: "superseded",
        label: "Pedido encerrado: a tentativa terminou antes da decisão",
        note: null,
      };

    default:
      return null;
  }
}

function occurrenceLineDetails(
  occurrences: DeliveryOccurrenceDetail[] | undefined,
): Record<string, OccurrenceLineDetail> {
  const details: Record<string, OccurrenceLineDetail> = {};

  for (const occurrence of occurrences ?? []) {
    const answers = labelledAnswers(
      occurrence.occurrenceType?.form_fields ?? null,
      occurrence.form_answers ?? null,
    );
    const authorization = authorizationOf(occurrence);

    if (answers.length === 0 && !authorization) continue;

    details[occurrence.id] = { answers, authorization };
  }

  return details;
}

export { occurrenceLineDetails };
export type { AuthorizationTone, OccurrenceLineDetail };
