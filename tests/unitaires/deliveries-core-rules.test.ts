import { describe, expect, it } from "vitest";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  NOT_EDITABLE_REASON,
  inTransitBlocker,
  isDeliveryEditable,
} from "@/features/deliveries/lib/status";
import { receivedByError } from "@/features/deliveries/lib/received-by";
import { isValidCnpj } from "@/features/deliveries/lib/cnpj";
import {
  canCloseImportDialog,
  importRevalidationTags,
  importToastKind,
} from "@/features/deliveries/lib/import-outcome";
import { deliveriesListQuery } from "@/features/deliveries/deliveries/server-table";
import {
  insertToken,
  isTemplateDirty,
  templateBodyError,
  templateSubjectError,
} from "@/features/deliveries/message-templates/lib/template-rules";

import {
  occurrenceTypeWriteBlocker,
  SYSTEM_OCCURRENCE_TYPE_REASON,
} from "@/features/deliveries/lib/occurrence-type-rules";
import { createUpdateDeliverySchema } from "@/schemas/create-update-delivery-schema";
import { createUpdateShipperSchema } from "@/schemas/create-update-shipper-schema";

/**
 * The rules the deliveries screens mirror from the API (package dlv-core).
 * Each one fixes a reported defect; the API stays the authority, and these
 * keep the screen from offering what it would refuse.
 */
const SHIPPER = "018f0000-0000-7000-8000-0000000000f1";

describe("editing a delivery (DLV-EDIT-2)", () => {
  it("is offered only while pending or failed, like the API", () => {
    expect(isDeliveryEditable("PENDING")).toBe(true);
    expect(isDeliveryEditable("FAILED")).toBe(true);

    // "Em rota" used to open the form and fail with a 400 on save.
    expect(isDeliveryEditable("IN_TRANSIT")).toBe(false);
    expect(isDeliveryEditable("DELIVERED")).toBe(false);
    expect(isDeliveryEditable("CANCELLED")).toBe(false);

    expect(NOT_EDITABLE_REASON).toContain("pendentes ou com insucesso");
  });
});

describe("the panel's status override (decisions 5.3 and 5.4)", () => {
  it("does not offer 'Em rota' without a driver or on a route that did not leave", () => {
    expect(inTransitBlocker({ driverId: null })).toContain(
      "Atribua um motorista",
    );
    expect(
      inTransitBlocker({ driverId: "d1", openRouteStatus: "RELEASED" }),
    ).toContain("Inicie a rota");
    expect(inTransitBlocker({ driverId: "d1" })).toBeNull();
  });

  it.each([
    ["", "Informe quem recebeu a entrega."],
    ["J", "no mínimo 2 caracteres"],
    ["João  Silva", "espaços consecutivos"],
    [" João", "começar ou terminar"],
  ])(
    "requires who received it, with the API's text rules: %j",
    (value, message) => {
      expect(receivedByError(value)).toContain(message);
    },
  );

  it("accepts a proper name", () => {
    expect(receivedByError("Maria da Portaria")).toBeNull();
  });
});

describe("the delivery form's fields", () => {
  const valid = {
    shipperId: SHIPPER,
    recipient_name: "Cliente",
    cep: "01001000",
    city: "São Paulo",
    uf: "SP",
    street: "Praça da Sé",
  };

  it("sends the expected date as a day (decision 1.3)", () => {
    expect(
      createUpdateDeliverySchema.safeParse({
        ...valid,
        scheduled_date: "2026-09-17",
      }).success,
    ).toBe(true);

    for (const value of ["2026-09-17T03:00:00.000Z", "2026-02-30"]) {
      expect(
        createUpdateDeliverySchema.safeParse({
          ...valid,
          scheduled_date: value,
        }).success,
      ).toBe(false);
    }
  });

  it("accepts notes in paragraphs but not doubled spaces (decision 5.5)", () => {
    expect(
      createUpdateDeliverySchema.safeParse({
        ...valid,
        notes: "Portão azul.\r\n\r\nTocar o 2.",
      }).success,
    ).toBe(true);

    expect(
      createUpdateDeliverySchema.safeParse({ ...valid, notes: "Portão  azul." })
        .success,
    ).toBe(false);
  });
});

describe("the shipper's CNPJ (decision 5.7)", () => {
  it("checks the digits, like the API", () => {
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11222333000182")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);

    const parsed = createUpdateShipperSchema.safeParse({
      name: "Matriz",
      cnpj: "11.222.333/0001-82",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("the customer messages (DLV-MSG-1/2)", () => {
  it("refuses an unknown variable with the API's sentence, spaces inside the braces included", () => {
    const error = templateBodyError(
      "Olá {{ gabriel }}, sua entrega chegou.",
      "EMAIL",
    );

    expect(error).toContain(
      "A mensagem usa variáveis que não existem: {{gabriel}}.",
    );
    expect(error).toContain("{{destinatario}}");

    expect(templateSubjectError("Oi {{motorista}}")).toContain("{{motorista}}");
    expect(templateSubjectError(" Entrega")).toContain("começar ou terminar");
  });

  it("refuses a body of spaces and a WhatsApp message without the way out", () => {
    expect(templateBodyError("            ", "EMAIL")).toContain(
      "no mínimo 10",
    );
    expect(
      templateBodyError("Sua entrega chegou, {{destinatario}}.", "WHATSAPP"),
    ).toContain("{{link_descadastro}}");
    expect(
      templateBodyError("Chegou! Sair: {{ link_descadastro }}", "WHATSAPP"),
    ).toBeNull();
  });

  it("keeps Salvar disabled until something changed (decision 2.5)", () => {
    const saved = {
      subject: null,
      body: "Sua entrega chegou.",
      is_active: true,
    };

    expect(
      isTemplateDirty(saved, {
        subject: "",
        body: "Sua entrega chegou.",
        is_active: true,
      }),
    ).toBe(false);
    expect(
      isTemplateDirty(saved, {
        subject: "",
        body: "Sua entrega chegou.",
        is_active: false,
      }),
    ).toBe(true);
    expect(
      isTemplateDirty(null, { subject: "", body: "", is_active: true }),
    ).toBe(true);
  });

  it("never cuts a variable at the character limit", () => {
    const body = "a".repeat(890);

    expect(insertToken(body, 890, 890, "{{link_descadastro}}", 900)).toBeNull();
    expect(insertToken("Oi ", 3, 3, "{{uf}}", 900)).toBe("Oi {{uf}}");
  });
});

describe("after an import (DLV-IMP-3, DLV-IMP-UI-1)", () => {
  it("refreshes Importações, the deliveries and the routes on every answer", () => {
    expect(importRevalidationTags(0)).toEqual([
      "update-import",
      "update-delivery",
      "update-route",
    ]);
    expect(importRevalidationTags(2)).toContain("update-shipper");
  });

  it("does not celebrate an upload that created nothing", () => {
    expect(importToastKind(0)).toBe("warning");
    expect(importToastKind(3)).toBe("success");
  });

  it("keeps the dialog open while the upload is in flight", () => {
    expect(canCloseImportDialog(true)).toBe(false);
    expect(canCloseImportDialog(false)).toBe(true);
  });

  it.each(["import-xml-dialog", "import-spreadsheet-dialog"])(
    "wires the in-flight guard into the %s's root Dialog",
    (dialog) => {
      const source = readFileSync(
        resolve(
          __dirname,
          `../../src/features/deliveries/deliveries/${dialog}/index.tsx`,
        ),
        "utf8",
      ).replace(/\r\n/g, "\n");

      const start = source.search(/<Dialog\s/);
      const tag = source.slice(
        start,
        source.indexOf("<DialogScrollContent", start),
      );

      expect(tag).toMatch(/onOpenChange=/);
      expect(tag).toMatch(/canCloseImportDialog\(isImporting\)/);

      // max-w-xl, the width of the dialogs the user named as the reference.
      expect(source).toMatch(/<DialogScrollContent className="[^"]*max-w-xl/);
    },
  );
});

describe("the deliveries table on the server (decision 8.8)", () => {
  it("forwards its sort and facets, and nothing it does not declare", () => {
    expect(
      deliveriesListQuery({
        sort: "shipperName",
        order: "desc",
        status: "PENDING,FAILED,BOGUS",
        shipperId: SHIPPER,
        driverId: "not-a-uuid",
        page: "3",
        tab: "deliveries",
      }),
    ).toEqual({
      sort: "shipperName",
      order: "desc",
      status: "PENDING,FAILED",
      shipperId: SHIPPER,
      // The list opens on today (meeting of 14/10/2026); the API is told.
      period: "today",
    });
  });
});

describe("the row menu (decision 3.5)", () => {
  it("is the standard menu, with no extra eye button and no icons", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../../src/features/deliveries/deliveries/row-actions.tsx",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/<Eye\b|lucide-react/);
    expect(source).not.toMatch(/\bicon=/);
  });

  // Embarcadores, Tipos and Motivos hand-rolled their menus with a black
  // "Deletar" beside a red trash icon, on the same screen as the standard.
  const featureRoot = resolve(__dirname, "../../src/features/deliveries");

  const rowMenus = readdirSync(featureRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(featureRoot, entry.name, "row-actions.tsx"))
    .filter((file) => existsSync(file));

  it("finds every tab's row menu", () => {
    expect(rowMenus.length).toBeGreaterThanOrEqual(6);
  });

  it.each(rowMenus.map((file) => [file.slice(featureRoot.length + 1), file]))(
    "%s uses the shared RowActions, text only",
    (_name, file) => {
      const source = readFileSync(file, "utf8");

      expect(source).toMatch(
        /from "@\/components\/shared\/custom\/row-actions"/,
      );
      expect(source).not.toMatch(
        /DropdownMenuContent|@\/components\/ui\/dropdown-menu/,
      );
      expect(source).not.toMatch(/lucide-react|\bicon=/);
    },
  );

  // "Comprovante rejeitado" is written by the proof audit: the API refuses
  // editing or deleting it (409 OCCURRENCE_TYPE_SYSTEM), and the menu offered
  // both (DLVP-OCC-3).
  it("disables Editar and Deletar on the platform's own occurrence type", () => {
    expect(occurrenceTypeWriteBlocker({ is_system: true }, null)).toBe(
      SYSTEM_OCCURRENCE_TYPE_REASON,
    );
    expect(SYSTEM_OCCURRENCE_TYPE_REASON).toMatch(/^Tipo do sistema/);
    expect(occurrenceTypeWriteBlocker({ is_system: false }, null)).toBeNull();
    expect(occurrenceTypeWriteBlocker({}, null)).toBeNull();

    // A missing permission is the reason on every row, the system one too.
    expect(
      occurrenceTypeWriteBlocker({ is_system: true }, "Sem permissão"),
    ).toBe("Sem permissão");

    const source = readFileSync(
      join(featureRoot, "occurrence-types", "row-actions.tsx"),
      "utf8",
    );

    // Both write items read the rule's answer, with the row's own type;
    // Deletar also refuses a seeded default (decision 14.3).
    expect(source).toMatch(/occurrenceTypeWriteBlocker\(\s*occurrenceType,/);
    expect(source.match(/blockedReason=\{writeBlocker\}/g)?.length).toBe(1);
    expect(source).toMatch(
      /const deleteBlocker = writeBlocker \?\? deleteBlockerOf\(occurrenceType\)/,
    );
    expect(source.match(/blockedReason=\{deleteBlocker\}/g)?.length).toBe(1);
  });
});

describe("the monitoring cards (decision 1.1)", () => {
  it("say which window each number counts", async () => {
    const { STATS_BY_TAB } =
      await import("@/features/deliveries/lib/stats-config");

    const described = Object.fromEntries(
      STATS_BY_TAB.monitoring.map((card) => [card.key, card.description ?? ""]),
    );

    // The "today" cards are the company's business day, not the browser's.
    for (const key of [
      "delivered-today",
      "failed-today",
      "occurrences-today",
    ]) {
      expect(described[key]).toContain("fuso da empresa");
    }

    // The backlog card spans every date; "aguardando" alone read as today.
    expect(described.unassigned).toContain("qualquer data");

    // "Designadas" is the tower's day (decision 7.1): PENDING on today's
    // routes or on one still running, the same count the dashboard panel
    // names. "De qualquer data" contradicted the number under it.
    expect(described.designated).toBe("Nas rotas de hoje, ainda não saíram");
    expect(described.designated).not.toContain("qualquer data");
  });

  it.each([
    ["deliveries", "total-deliveries"],
    ["occurrences", "total-occurrences"],
    ["shippers", "total-shippers"],
    ["occurrence-types", "total-types"],
    ["status-change-reasons", "total-reasons"],
  ] as const)(
    "the %s total says it follows the search, not the whole company",
    async (tab, key) => {
      const { STATS_BY_TAB } =
        await import("@/features/deliveries/lib/stats-config");

      const card = STATS_BY_TAB[tab].find((stat) => stat.key === key);

      // The API counts these over the typed search: "Cadastrados no sistema"
      // showed 2 with a search typed.
      expect(card?.description).toContain("na busca");
      expect(card?.description).not.toMatch(
        /no sistema|catálogo da empresa|na operação/,
      );
    },
  );
});

describe("the delivery detail's links and photos (decision 6.7, DLVB-06)", () => {
  const source = () =>
    readFileSync(
      resolve(
        __dirname,
        "../../src/features/deliveries/deliveries/detail-dialog/index.tsx",
      ),
      "utf8",
    );

  it("opens the chat through the shared link builder, never by hand", () => {
    // The hand-built params kept a previous link's chatRoute/chatFilter, so
    // the chat opened narrowed to another route.
    expect(source()).toMatch(/buildChatSearchParams\(routeSearchParams/);
    expect(source()).not.toMatch(/params\.set\("chatDriver"/);
  });

  it("shows the messages about the delivery and inspects photos with zoom", () => {
    expect(source()).toMatch(/<ChatLinkedMessages[\s\S]*kind: "delivery"/);
    expect(source()).toMatch(/<ImageInspector/);
    expect(source()).not.toMatch(/from "next\/image"/);
  });
});

describe("the deliveries and occurrences tables (decision 8.8)", () => {
  it("are always answered on the server, never by filtering the loaded page", () => {
    // Each tab's table is its own module (table/index.tsx loads them).
    const read = (file: string) =>
      readFileSync(
        resolve(__dirname, "../../src/features/deliveries/table", file),
        "utf8",
      );

    const deliveries = read("deliveries.tsx");

    // The page always sends the sort and facet params; a read without
    // searchMeta used to drop back to the page-only filters.
    expect(deliveries).toMatch(/server=\{DELIVERY_TABLE\}/);

    for (const table of [read("index.tsx"), deliveries]) {
      expect(table).not.toMatch(/serverMode/);
      expect(table).not.toMatch(/buildOccurrenceColumns/);
    }
  });
});
