import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CATEGORY_LOCKED_HELP,
  DEFAULT_TYPE_LOCKED_HELP,
  RECEIPT_NO_AI_WARNING,
  categoryLockReason,
  dialogIssues,
  receiptAiWarning,
  receiptPhotoDefault,
  sectionsFor,
  showsLegacyAppNotice,
  toggleValues,
} from "@/features/deliveries/occurrence-types/form-dialog/category-form";
import {
  categoryBadgeOf,
  deleteBlockerOf,
  requirementsOf,
} from "@/features/deliveries/occurrence-types/category-display";
import { createUpdateOccurrenceTypeSchema } from "@/schemas/create-update-occurrence-type-schema";

import type { OccurrenceTypeData } from "@/actions/occurrence-type/list-occurrence-type";

import { refusal, stubRelay } from "./helpers/relay-fetch";

// The canary hooks Next ships; the test's React does not have them.
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormState: (_action: unknown, initial: unknown) => [initial, () => {}],
  useFormStatus: () => ({ pending: false }),
}));

vi.mock("@/actions/occurrence-type/create-occurrence-type", () => ({
  handleCreateOccurrenceType: vi.fn(async () => ({})),
}));
vi.mock("@/actions/occurrence-type/update-occurrence-type", () => ({
  handleUpdateOccurrenceType: vi.fn(async () => ({})),
}));

// The company's AI quota, as GET /business/get-ai-usage/:id answers it
// through the relay (design §7.2); null is a refusal.
const aiUsage = { limit: 10 as number | null };

function serveAiUsage(): void {
  stubRelay([
    [
      /^\/business\/get-ai-usage\/[^/]+$/,
      () =>
        aiUsage.limit === null
          ? refusal(403, { code: "PERMISSION_DENIED", message: "Sem acesso." })
          : {
              data: {
                ai_analysis_limit: aiUsage.limit,
                ai_analysis_used: 0,
                ai_analysis_reset_at: null,
              },
            },
    ],
  ]);
}

/**
 * The occurrence type dialog with categories (decisions 14.3 and 14.4;
 * design §7.2): what each category shows and sends, the lock on a used or
 * default type, and the table's category and requirements cells.
 */

describe("what the dialog shows per category", () => {
  it("offers a delivery every requirement but blocking, a problem everything, a pause only its nature", () => {
    expect(sectionsFor("DELIVERED")).toEqual({
      receiptPhoto: true,
      signature: true,
      photos: true,
      blocking: false,
      authorization: true,
      form: true,
      pauseKind: false,
    });
    expect(sectionsFor("NOT_DELIVERED")).toMatchObject({
      blocking: true,
      receiptPhoto: true,
      pauseKind: false,
    });
    expect(sectionsFor("PAUSE")).toEqual({
      receiptPhoto: false,
      signature: false,
      photos: false,
      blocking: false,
      authorization: false,
      form: false,
      pauseKind: true,
    });
  });

  it("sends a switch the category hides as off, whatever its last state on screen", () => {
    const allOn = () => true;

    expect(toggleValues("PAUSE", allOn)).toEqual({
      requires_photo: "false",
      requires_receipt_photo: "false",
      requires_signature: "false",
      blocks_delivery: "false",
      requires_authorization: "false",
    });
    expect(toggleValues("DELIVERED", allOn)).toMatchObject({
      blocks_delivery: "false",
      requires_receipt_photo: "true",
      requires_signature: "true",
    });
    // What it sends is what the API's matrix accepts.
    expect(
      dialogIssues({
        category: "PAUSE",
        pauseKind: "REST",
        toggles: toggleValues("PAUSE", allOn),
        hasForm: true,
      }),
    ).toEqual([]);
    expect(
      dialogIssues({
        category: "PAUSE",
        pauseKind: null,
        toggles: toggleValues("PAUSE", allOn),
        hasForm: false,
      }),
    ).toEqual([
      {
        field: "pause_kind",
        message:
          "Escolha a natureza legal da pausa (refeição, descanso ou outra).",
      },
    ]);
  });

  it("locks the category of a default or used type, with the reason", () => {
    expect(categoryLockReason(null)).toBeNull();
    expect(categoryLockReason({ is_default: false, in_use: false })).toBeNull();
    expect(categoryLockReason({ in_use: true })).toBe(CATEGORY_LOCKED_HELP);
    expect(categoryLockReason({ is_default: true, in_use: false })).toBe(
      DEFAULT_TYPE_LOCKED_HELP,
    );
  });

  it("warns about the installed app only on the default delivery type", () => {
    expect(
      showsLegacyAppNotice({ is_default: true, category: "DELIVERED" }),
    ).toBe(true);
    expect(showsLegacyAppNotice({ is_default: true, category: "PAUSE" })).toBe(
      false,
    );
    expect(
      showsLegacyAppNotice({ is_default: false, category: "DELIVERED" }),
    ).toBe(false);
  });
});

describe("the receipt switch (review r1)", () => {
  it("starts on for a delivery type unless the stored one says otherwise", () => {
    // Create: the category decides, as "Entrega normal" does.
    expect(receiptPhotoDefault(null, "DELIVERED")).toBe(true);
    expect(receiptPhotoDefault(null, "NOT_DELIVERED")).toBe(false);

    // Edit: the stored value while the category is the stored one.
    expect(
      receiptPhotoDefault(
        { category: "DELIVERED", requires_receipt_photo: false },
        "DELIVERED",
      ),
    ).toBe(false);
    expect(
      receiptPhotoDefault(
        { category: "NOT_DELIVERED", requires_receipt_photo: false },
        "DELIVERED",
      ),
    ).toBe(true);
  });

  it("warns only when the company has no AI quota, not when it is unknown", () => {
    expect(receiptAiWarning(0)).toBe(RECEIPT_NO_AI_WARNING);
    expect(receiptAiWarning(50)).toBeNull();
    expect(receiptAiWarning(null)).toBeNull();
    expect(RECEIPT_NO_AI_WARNING).toBe(
      "Sua empresa não tem o módulo de IA: o canhoto vai só para a auditoria humana.",
    );
  });
});

describe("the action's schema", () => {
  it("takes the category, the new switches and the nature as the form posts them", () => {
    const parsed = createUpdateOccurrenceTypeSchema.parse({
      name: "Lanche",
      category: "PAUSE",
      pause_kind: "REST",
      requires_receipt_photo: "false",
      requires_signature: "false",
    });

    expect(parsed).toMatchObject({
      category: "PAUSE",
      pause_kind: "REST",
      requires_receipt_photo: false,
      requires_signature: false,
    });
    expect(
      createUpdateOccurrenceTypeSchema.parse({ name: "Recusa", pause_kind: "" })
        .pause_kind,
    ).toBeNull();
    expect(
      createUpdateOccurrenceTypeSchema.safeParse({
        name: "X1",
        category: "OUTRA",
      }).success,
    ).toBe(false);
  });
});

describe("the table's cells", () => {
  it("names the category, a type from an older API reading as Não entrega", () => {
    expect(categoryBadgeOf("DELIVERED").label).toBe("Entrega");
    expect(categoryBadgeOf("PAUSE").label).toBe("Pausa");
    expect(categoryBadgeOf(undefined).label).toBe("Não entrega");
  });

  it("lists the requirements, or the nature of a pause", () => {
    expect(
      requirementsOf({
        category: "DELIVERED",
        requires_receipt_photo: true,
        requires_signature: true,
        requires_photo: false,
        requires_authorization: true,
        blocks_delivery: false,
        form_fields: [
          { key: "lacre", label: "Lacre", type: "text", required: true },
        ],
      }),
    ).toEqual(["Canhoto", "Assinatura", "Formulário", "Autorização"]);
    expect(
      requirementsOf({
        category: "PAUSE",
        pause_kind: "MEAL",
        requires_photo: false,
        blocks_delivery: false,
      }),
    ).toEqual(["Natureza: Refeição"]);
  });

  it("disables Deletar on a default type, with the API's reason", () => {
    expect(deleteBlockerOf({ is_default: true })).toBe(
      "Tipo padrão: pode ser editado ou desativado, não excluído.",
    );
    expect(deleteBlockerOf({ is_default: false })).toBeNull();
  });
});

describe("the dialog on screen", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal("React", React);
  });

  beforeEach(() => {
    serveAiUsage();
  });

  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  const type = (
    overrides: Partial<OccurrenceTypeData>,
  ): OccurrenceTypeData => ({
    id: "t1",
    name: "Tipo",
    description: null,
    requires_photo: false,
    blocks_delivery: false,
    is_active: true,
    businessId: "b1",
    created_at: "2026-10-05T10:00:00.000Z",
    updated_at: "2026-10-05T10:00:00.000Z",
    ...overrides,
  });

  async function open(occurrenceType: OccurrenceTypeData | null) {
    const { OccurrenceTypeFormDialog } =
      await import("@/features/deliveries/occurrence-types/form-dialog");

    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root!.render(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(OccurrenceTypeFormDialog, {
            businessId: "b1",
            occurrenceType,
            isOpen: true,
            onClose: () => {},
          }),
        ),
      );
    });

    return document.body;
  }

  // A few ticks: the relay read answers (fetch, then its body) over more
  // than one.
  const settle = async () => {
    for (let tick = 0; tick < 5; tick += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  };

  it("turns the receipt on when a new type becomes a delivery type", async () => {
    aiUsage.limit = 10;

    const page = await open(null);
    const receipt = () =>
      page.querySelector("#requires_receipt_photo") as HTMLButtonElement;

    // A new type starts as Não entrega: the receipt is off.
    expect(receipt().getAttribute("data-state")).toBe("unchecked");

    await act(async () => {
      (page.querySelector("#category-DELIVERED") as HTMLButtonElement).click();
    });

    expect(receipt().getAttribute("data-state")).toBe("checked");
  });

  it("warns that the receipt only reaches the human audit without the AI module", async () => {
    aiUsage.limit = 0;

    const page = await open(
      type({
        name: "Entrega normal",
        category: "DELIVERED",
        requires_receipt_photo: true,
      }),
    );

    await settle();

    expect(page.textContent).toContain(RECEIPT_NO_AI_WARNING);
  });

  it("says nothing about AI when the quota cannot be read", async () => {
    aiUsage.limit = null;

    const page = await open(
      type({
        name: "Entrega normal",
        category: "DELIVERED",
        requires_receipt_photo: true,
      }),
    );

    await settle();

    expect(page.textContent).not.toContain(RECEIPT_NO_AI_WARNING);
    aiUsage.limit = 10;
  });

  it("wires the category group to its label, requirement and lock reason", async () => {
    const page = await open(
      type({ name: "Avaria", category: "NOT_DELIVERED", in_use: true }),
    );

    const group = page.querySelector('[role="radiogroup"]#category')!;

    expect(group).not.toBeNull();
    expect(group.getAttribute("aria-required")).toBe("true");
    expect(group.getAttribute("aria-describedby")).toBe("category-hint");
    expect(page.querySelector("#category-hint")?.textContent).toBe(
      CATEGORY_LOCKED_HELP,
    );
  });

  it("shows a pause type its nature and none of the delivery switches", async () => {
    const page = await open(
      type({
        name: "Lanche",
        category: "PAUSE",
        pause_kind: "REST",
        in_use: false,
      }),
    );

    expect(page.textContent).toContain("Natureza legal *");
    expect(page.textContent).toContain(
      'Só "Refeição" conta como intervalo de refeição',
    );
    expect(page.querySelector("#requires_photo")).toBeNull();
    expect(page.querySelector("#blocks_delivery")).toBeNull();
    expect(page.querySelector("#requires_receipt_photo")).toBeNull();
    expect(
      (
        page.querySelector(
          'input[name="pause_kind"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("REST");
  });

  it("locks the category of the default delivery type and warns about the installed app", async () => {
    const page = await open(
      type({
        name: "Entrega normal",
        category: "DELIVERED",
        requires_receipt_photo: true,
        is_default: true,
      }),
    );

    expect(page.textContent).toContain(DEFAULT_TYPE_LOCKED_HELP);
    expect(page.textContent).toContain(
      "Aplicativos anteriores aos tipos de entrega",
    );
    expect(page.querySelector("#blocks_delivery")).toBeNull();
    expect(page.querySelector("#requires_signature")).not.toBeNull();

    const radios = Array.from(
      page.querySelectorAll('[role="radio"]'),
    ) as HTMLButtonElement[];

    expect(radios.length).toBeGreaterThanOrEqual(3);
    expect(radios.every((radio) => radio.disabled)).toBe(true);
  });
});
