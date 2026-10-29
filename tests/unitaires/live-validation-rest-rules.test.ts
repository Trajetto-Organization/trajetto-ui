import { describe, expect, it } from "vitest";

import { routeFormLiveIssues } from "@/schemas/create-update-route-schema";
import {
  composerLengthNotice,
  CHAT_MESSAGE_MAX,
} from "@/features/deliveries/chat/lib/composer-length";
import { spreadsheetRejection } from "@/features/deliveries/deliveries/import-spreadsheet-dialog/hooks";
import { xmlRejection } from "@/features/deliveries/deliveries/import-xml-dialog/hooks";
import { whatsAppPhoneIssue } from "@/app/(protected)/_components/profile/notifications/whatsapp/whatsapp-settings";

/**
 * The pure rules the live validation of the remaining forms reads
 * (decision 16.700): the route form (create and edit), the chat composer's
 * length, the import pickers' refusals and the WhatsApp number.
 */

const DRIVER = "018f0000-0000-7000-8000-0000000000d1";

const empty = {
  name: "",
  destination: "",
  driverId: "",
  vehicleId: "",
  scheduled_date: "2026-09-17",
  planned_departure_at: "",
  planned_arrival_at: "",
};

describe("the route form's live issues", () => {
  it("calls an empty driver missing, not an invalid id", () => {
    // Red before: the schema alone answered "O motorista deve ter um
    // identificador válido." for the empty hidden input.
    expect(routeFormLiveIssues(empty).driverId).toBe(
      "O motorista é obrigatório.",
    );
  });

  it("shows the window rule without waiting for the driver", () => {
    // Red before: the window was an object superRefine, which zod only
    // runs once every field (the driver included) is valid.
    const issues = routeFormLiveIssues({
      ...empty,
      planned_departure_at: "2026-09-17T15:00:00.000Z",
      planned_arrival_at: "2026-09-17T12:00:00.000Z",
      plan_time_zone: "America/Sao_Paulo",
    });

    expect(issues.driverId).toBe("O motorista é obrigatório.");
    expect(issues.planned_arrival_at).toBe(
      "O retorno previsto deve ser igual ou posterior à saída prevista.",
    );
  });

  it("checks only what an edit changed, like the update action", () => {
    // A stored name that predates the spacing rule: renaming the
    // destination must not be refused for it.
    const initial = { ...empty, name: "Zona  Sul", driverId: DRIVER };
    const issues = routeFormLiveIssues(
      { ...initial, destination: "CD Cajamar" },
      initial,
    );

    expect(issues.name).toBeUndefined();
    expect(issues.destination).toBeNull();
  });

  it("judges the window on an edit only once a plan field changed", () => {
    const initial = {
      ...empty,
      driverId: DRIVER,
      planned_departure_at: "2026-09-17T15:00:00.000Z",
      planned_arrival_at: "2026-09-17T12:00:00.000Z",
    };

    expect(
      routeFormLiveIssues({ ...initial, name: "Zona Norte" }, initial)
        .planned_arrival_at,
    ).toBeUndefined();
    expect(
      routeFormLiveIssues(
        { ...initial, planned_arrival_at: "2026-09-17T13:00:00.000Z" },
        initial,
      ).planned_arrival_at,
    ).toBe("O retorno previsto deve ser igual ou posterior à saída prevista.");
  });
});

describe("the chat composer's length notice", () => {
  it("stays silent under 90% of the limit", () => {
    expect(composerLengthNotice(0)).toBeNull();
    expect(composerLengthNotice(1799)).toBeNull();
  });

  it("counts from 90% and says so at the limit", () => {
    // Red before: the field cut a long paste at 2,000 characters without a word.
    expect(composerLengthNotice(1800)).toEqual({
      count: "1.800/2.000",
      limitMessage: null,
    });
    expect(composerLengthNotice(CHAT_MESSAGE_MAX)?.limitMessage).toBe(
      "Limite de 2.000 caracteres atingido: o que passar disso não entra na mensagem.",
    );
  });
});

describe("the import pickers' refusals", () => {
  it("names a spreadsheet that is not one, or is too big", () => {
    expect(spreadsheetRejection({ name: "notas.pdf", size: 10 })).toBe(
      '"notas.pdf" não é uma planilha .xlsx ou .csv.',
    );
    expect(
      spreadsheetRejection({ name: "carga.xlsx", size: 7 * 1024 * 1024 }),
    ).toBe('"carga.xlsx" é grande demais (limite de 6 MB).');
    expect(spreadsheetRejection({ name: "carga.CSV", size: 100 })).toBeNull();
  });

  it("says in one sentence what an XML pick left out", () => {
    expect(
      xmlRejection([
        { name: "a.pdf", size: 1, type: "application/pdf" },
        { name: "b.png", size: 1, type: "image/png" },
        { name: "nota.xml", size: 600 * 1024, type: "text/xml" },
      ]),
    ).toBe(
      '2 arquivos foram ignorados por não serem XML. "nota.xml" é grande demais para uma NF-e (limite de 512 KB).',
    );
    expect(
      xmlRejection([{ name: "nota.xml", size: 1024, type: "" }]),
    ).toBeNull();
  });
});

describe("the WhatsApp number", () => {
  it("asks for it only when it is required and calls a short one incomplete", () => {
    expect(whatsAppPhoneIssue("", true)).toBe(
      "Informe o número com DDD para receber pelo WhatsApp.",
    );
    expect(whatsAppPhoneIssue("(11) 9876", false)).toBe(
      "Número incompleto: são 10 dígitos para fixo ou 11 para celular, com o DDD.",
    );
    expect(whatsAppPhoneIssue("(11) 3876-4321", true)).toBeNull();
    expect(whatsAppPhoneIssue("(11) 98765-4321", true)).toBeNull();
  });

  it("accepts an empty number while notifications stay off, as the action does", () => {
    // Red before: the hand-written copy refused an empty number in any state.
    expect(whatsAppPhoneIssue("", false)).toBeNull();
  });
});
