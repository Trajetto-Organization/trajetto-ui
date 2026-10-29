import { describe, expect, it } from "vitest";

import { occurrenceLineDetails } from "@/features/deliveries/deliveries/timeline/occurrence-details";
import { createUpdateOccurrenceTypeSchema } from "@/schemas/create-update-occurrence-type-schema";

import type { DeliveryOccurrenceDetail } from "@/actions/delivery/get-delivery";

/**
 * What the delivery's history adds under an occurrence line (decisions 6.2
 * and 6.3), and how the type dialog's form reaches the action.
 */
function occurrence(
  patch: Partial<DeliveryOccurrenceDetail>,
): DeliveryOccurrenceDetail {
  return {
    id: "o1",
    description: null,
    latitude: null,
    longitude: null,
    photos: [],
    created_at: "2026-09-29T12:00:00.000Z",
    occurrenceType: {
      id: "t1",
      name: "Cliente ausente",
      blocks_delivery: true,
      requires_authorization: true,
      form_fields: [
        {
          key: "quem",
          label: "Quem atendeu",
          type: "text",
          required: true,
          max_length: 200,
          multiline: false,
        },
        {
          key: "ligou",
          label: "Ligou para o cliente",
          type: "boolean",
          required: true,
        },
      ],
      form_version: 1,
    },
    reportedBy: { id: "u1", name: "João" },
    form_answers: { quem: "Porteiro", ligou: false },
    form_version: 1,
    authorization_status: "PENDING",
    authorizedBy: null,
    authorized_at: null,
    authorization_note: null,
    escalated_at: null,
    ...patch,
  };
}

describe("an occurrence line in the history", () => {
  it("shows the answers labelled and a request still waiting", () => {
    expect(occurrenceLineDetails([occurrence({})])).toEqual({
      o1: {
        answers: [
          { key: "quem", label: "Quem atendeu", value: "Porteiro" },
          { key: "ligou", label: "Ligou para o cliente", value: "Não" },
        ],
        authorization: {
          tone: "pending",
          label: "Aguardando autorização da torre",
          note: null,
        },
      },
    });
  });

  it("says who decided and why", () => {
    const denied = occurrenceLineDetails([
      occurrence({
        authorization_status: "DENIED",
        authorizedBy: { id: "u2", name: "Ana" },
        authorization_note: "Deixe com o porteiro.",
      }),
    ]);

    expect(denied.o1.authorization).toEqual({
      tone: "denied",
      label: "Negada por Ana",
      note: "Deixe com o porteiro.",
    });

    const escalated = occurrenceLineDetails([
      occurrence({ escalated_at: "2026-09-29T12:11:00.000Z" }),
    ]);

    expect(escalated.o1.authorization?.label).toBe(
      "Aguardando autorização da torre (escalado aos administradores)",
    );

    expect(
      occurrenceLineDetails([
        occurrence({ authorization_status: "SUPERSEDED" }),
      ]).o1.authorization?.tone,
    ).toBe("superseded");
  });

  it("adds nothing to a plain occurrence", () => {
    expect(
      occurrenceLineDetails([
        occurrence({
          authorization_status: "NOT_REQUIRED",
          form_answers: null,
        }),
      ]),
    ).toEqual({});
  });
});

describe("the type dialog's form, on its way to the API", () => {
  it("reads the builder's JSON, empty as no form, and refuses a broken one", () => {
    const form = JSON.stringify([
      { key: "quem", label: "Quem atendeu", type: "text", required: true },
    ]);

    const parsed = createUpdateOccurrenceTypeSchema.parse({
      name: "Cliente ausente",
      requires_authorization: "true",
      form_fields: form,
    });

    expect(parsed.requires_authorization).toBe(true);
    expect(parsed.form_fields).toEqual([
      { key: "quem", label: "Quem atendeu", type: "text", required: true },
    ]);

    expect(
      createUpdateOccurrenceTypeSchema.parse({ name: "Sem", form_fields: "" })
        .form_fields,
    ).toBeNull();

    expect(
      createUpdateOccurrenceTypeSchema.safeParse({
        name: "Ruim",
        form_fields: JSON.stringify([
          { key: "Maiúscula", label: "X", type: "text" },
        ]),
      }).success,
    ).toBe(false);
  });
});
