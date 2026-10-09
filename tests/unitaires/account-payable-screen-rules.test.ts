import { describe, expect, it } from "vitest";

import {
  ACCOUNT_PAYABLE_TABLE,
  accountPayableListQuery,
  type AccountPayableRow,
} from "@/features/account-payable/lib/server-table";
import {
  STATUS_GROUP_LABELS,
  isDeletable,
  statusMetaOf,
} from "@/features/account-payable/lib/status";
import {
  TOTAL_ACCOUNTS_DESCRIPTION,
  accountPayableStatsData,
  countWithShare,
  payeeLabel,
} from "@/features/account-payable/lib/stats-data";
import {
  FULL_ACCESS,
  NO_ACCESS_HINTS,
  initialFormValues,
  isFormDirty,
  isPayeeRequired,
  toSubmission,
} from "@/features/account-payable/lib/form-values";
import {
  businessIdQuery,
  hasSelectedBusiness,
  scopedBusinessId,
} from "@/features/supplier/lib/scope";
import {
  createAccountPayableSchema,
  updateAccountPayableSchema,
} from "@/schemas/create-update-account-payable-schema";

/**
 * The unified Contas a pagar screen (decisions 8.4, 8.7, 8.8): which company
 * it acts on, what it asks the API, how it reads the API's status and cards,
 * and what the one-step form sends.
 */
const A = "018f0000-0000-7000-8000-00000000000a";
const SESSION = "018f0000-0000-7000-8000-00000000000b";
const BRANCH = "018f0000-0000-7000-8000-0000000000b1";
const USER = "018f0000-0000-7000-8000-0000000000a1";
const SUPPLIER = "018f0000-0000-7000-8000-0000000000c1";

const bill = (
  overrides: Partial<AccountPayableRow> = {},
): AccountPayableRow => ({
  id: "018f0000-0000-7000-8000-0000000000f1",
  issue_date: "2026-09-10T15:00:00.000Z",
  due_date: "2026-09-17T03:00:00.000Z",
  payment_date: null,
  amount: 1500.5,
  amount_paid: null,
  category: "MAINTENANCE",
  category_description: null,
  businessId: A,
  branchId: BRANCH,
  serviceOrderId: null,
  registrationUserId: USER,
  supplierId: SUPPLIER,
  payee_name: null,
  vehicleId: null,
  description: "Troca de pneus",
  document_number: "NF 12",
  createdById: USER,
  created_at: "2026-09-10T15:00:00.000Z",
  updated_at: "2026-09-10T15:00:00.000Z",
  supplier: { id: SUPPLIER, name: "Oficina Central" },
  status: "PENDING",
  status_group: "OPEN",
  due_day: "2026-09-17",
  payment_day: null,
  remaining_amount: 1500.5,
  ...overrides,
});

describe("the company the screen acts on (decision 8.7)", () => {
  it("is the selector's on /admin and the session's on /dashboard", () => {
    expect(scopedBusinessId("admin", A, SESSION)).toBe(A);
    expect(scopedBusinessId("dashboard", A, SESSION)).toBe(SESSION);
  });

  it("is none on /admin until a real company id is chosen", () => {
    expect(scopedBusinessId("admin", null, SESSION)).toBeUndefined();
    expect(scopedBusinessId("admin", "../../user", SESSION)).toBeUndefined();
  });

  it("is sent to the API only by the MASTER's screen", () => {
    expect(businessIdQuery("admin", A)).toEqual({ businessId: A });
    expect(businessIdQuery("dashboard", SESSION)).toEqual({});
  });

  it("tells the /admin loading shape whether a company is picked", () => {
    // Without one the page is the selector and the empty box, and the
    // loading used to draw actions, cards and a table there.
    expect(hasSelectedBusiness(A)).toBe(true);
    expect(hasSelectedBusiness(null)).toBe(false);
    expect(hasSelectedBusiness("../../user")).toBe(false);
  });
});

describe("the list asks the server (decision 8.8)", () => {
  it("forwards the declared sort and facets and drops anything else", () => {
    expect(
      accountPayableListQuery({
        sort: "due_date",
        order: "desc",
        status: "OVERDUE,LATE,PAID",
        category: ["FUEL", "NOT_A_CATEGORY"],
        page: "2",
        businessId: A,
      }),
    ).toEqual({
      sort: "due_date",
      order: "desc",
      status: "OVERDUE,PAID",
      category: "FUEL",
    });
  });

  it("does not sort by the status (computed) nor by supplier (free-text payees)", () => {
    expect(ACCOUNT_PAYABLE_TABLE.sortable).not.toContain("status");
    expect(ACCOUNT_PAYABLE_TABLE.sortable).not.toContain("supplier");
    expect(accountPayableListQuery({ sort: "status" })).toEqual({});
  });
});

describe("the status reads the API's answer (decision 8.4)", () => {
  it("labels each of the six statuses, feminine like 'conta'", () => {
    expect(
      (
        [
          "PENDING",
          "PARTIAL",
          "OVERDUE",
          "PARTIAL_LATE",
          "PAID",
          "LATE",
        ] as const
      ).map((status) => statusMetaOf(status).label),
    ).toEqual([
      "Pendente",
      "Parcial",
      "Vencida",
      "Parcial com atraso",
      "Paga",
      "Paga com atraso",
    ]);
  });

  it("still renders a status this build does not know", () => {
    expect(statusMetaOf("SOMETHING_NEW").label).toBe("—");
  });

  it("offers the three situations the cards count as the filter", () => {
    expect(STATUS_GROUP_LABELS).toEqual({
      OPEN: "Em aberto",
      OVERDUE: "Vencida",
      PAID: "Paga",
    });
  });

  it("allows deleting only a bill with no payment", () => {
    expect(isDeletable(bill())).toBe(true);
    expect(
      isDeletable(
        bill({ amount_paid: 100, payment_date: "2026-09-12T12:00:00Z" }),
      ),
    ).toBe(false);
  });
});

describe("the cards come from searchMeta only", () => {
  it("maps the API's counts and sums, whatever rows are on screen", () => {
    expect(
      accountPayableStatsData({
        total: 22,
        open: 7,
        overdue: 3,
        paid: 12,
        openAmount: 850,
        overdueAmount: 500,
        paidAmount: 2400,
      }),
    ).toMatchObject({
      totalAccounts: 22,
      openAccounts: 7,
      overdueAccounts: 3,
      paidAccounts: 12,
    });
  });

  it("says the total card counts every situation (the API's disjunctive rule)", () => {
    // With "Vencidas" picked the table shows 2 and this card 12: it used to
    // say "Na busca e nos filtros atuais", which the number did not honour.
    expect(TOTAL_ACCOUNTS_DESCRIPTION).toContain("qualquer situação");
    expect(TOTAL_ACCOUNTS_DESCRIPTION).not.toContain("filtros atuais");
  });

  it("says zero, not NaN, before the API answers", () => {
    const empty = accountPayableStatsData(undefined);

    expect(empty.totalAccounts).toBe(0);
    expect(countWithShare(empty.openAccounts, empty.totalAccounts)).toBe("0");
    expect(countWithShare(3, 12)).toBe("3 (25%)");
  });

  it("names the payee: the supplier, or the free-text name", () => {
    expect(payeeLabel(bill())).toBe("Oficina Central");
    expect(
      payeeLabel(
        bill({ supplier: null, supplierId: null, payee_name: "Pedágio" }),
      ),
    ).toBe("Pedágio");
  });
});

describe("the one-step form", () => {
  it("opens an edit on the company's due DAY, not the instant", () => {
    const values = initialFormValues(bill());

    expect(values.due_date).toBe("2026-09-17");
    expect(values.payeeKind).toBe("supplier");
    expect(values.supplierId).toBe(SUPPLIER);
  });

  it("sends only the chosen payee", () => {
    const values = {
      ...initialFormValues(bill()),
      payeeKind: "name" as const,
      payee_name: "Pedágio Anhanguera",
    };

    expect(toSubmission(values)).toMatchObject({
      supplierId: "",
      payee_name: "Pedágio Anhanguera",
    });
  });

  it("keeps Salvar disabled until something that would be sent changes (2.5)", () => {
    const initial = initialFormValues(bill());

    // Switching the payee is a change; text typed in the payee field that is
    // not the chosen one is not sent, so it is not a change.
    expect(
      isFormDirty({ ...initial, payeeKind: "name", payee_name: "x" }, initial),
    ).toBe(true);
    expect(isFormDirty({ ...initial, payee_name: "rascunho" }, initial)).toBe(
      false,
    );
    expect(isFormDirty({ ...initial }, initial)).toBe(false);
    expect(isFormDirty({ ...initial, document_number: "NF 13" }, initial)).toBe(
      true,
    );
  });
});

describe("who the form asks for (decision 8.4 and the pickers' permissions)", () => {
  const legacy = bill({ supplier: null, supplierId: null, payee_name: null });

  it("requires a payee to create and to edit a bill that has one, not a legacy bill", () => {
    expect(isPayeeRequired()).toBe(true);
    expect(isPayeeRequired(bill())).toBe(true);
    expect(
      isPayeeRequired(bill({ supplierId: null, payee_name: "Pedágio" })),
    ).toBe(true);
    expect(isPayeeRequired(legacy)).toBe(false);
  });

  it("opens on the free-text payee when the profile cannot list suppliers", () => {
    const noSuppliers = { ...FULL_ACCESS, suppliers: false };

    expect(initialFormValues(undefined).payeeKind).toBe("supplier");
    expect(initialFormValues(undefined, noSuppliers).payeeKind).toBe("name");
    expect(initialFormValues(legacy, noSuppliers).payeeKind).toBe("name");
    // A registered payee stays: its name is on the row, the picker is read only.
    expect(initialFormValues(bill(), noSuppliers).payeeKind).toBe("supplier");
    expect(
      initialFormValues(
        bill({ supplierId: null, supplier: null, payee_name: "Pedágio" }),
      ).payeeKind,
    ).toBe("name");
  });

  it("says why a picker is off, in pt-BR", () => {
    expect(NO_ACCESS_HINTS).toEqual({
      suppliers:
        "Seu perfil não pode ver os fornecedores: informe o favorecido pelo nome.",
      vehicles: "Seu perfil não pode ver os veículos da empresa.",
      serviceOrders: "Seu perfil não pode ver as ordens de serviço da empresa.",
    });
  });
});

describe("the form's schema mirrors the API's", () => {
  const valid = {
    category: "MAINTENANCE",
    due_date: "2026-10-01",
    amount: "R$ 1.500,50",
    branchId: BRANCH,
    registrationUserId: USER,
    supplierId: SUPPLIER,
    payee_name: "",
  };

  it("accepts a picked day and a multiline description", () => {
    const parsed = createAccountPayableSchema.safeParse({
      ...valid,
      description: "Troca de embreagem\n\nPeças e mão de obra",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.amount).toBe(1500.5);
  });

  it("requires a payee, and only one", () => {
    const none = createAccountPayableSchema.safeParse({
      ...valid,
      supplierId: "",
    });
    const both = createAccountPayableSchema.safeParse({
      ...valid,
      payee_name: "Pedágio",
    });

    expect(none.success).toBe(false);
    expect(both.success).toBe(false);
    expect(
      !both.success && both.error.flatten().fieldErrors.payee_name,
    ).toEqual([
      "Informe o fornecedor cadastrado ou o nome do favorecido, não os dois.",
    ]);
  });

  it("lets an edit of a legacy bill go without a payee, and no other", () => {
    const withoutPayee = { ...valid, supplierId: "", payee_name: "" };

    // The one schema for create and update refused this, so registering the
    // payment of a bill from before the column was impossible.
    expect(
      updateAccountPayableSchema(false).safeParse(withoutPayee).success,
    ).toBe(true);
    expect(
      updateAccountPayableSchema(true).safeParse(withoutPayee).success,
    ).toBe(false);
    expect(createAccountPayableSchema.safeParse(withoutPayee).success).toBe(
      false,
    );
    expect(
      updateAccountPayableSchema(false).safeParse({
        ...valid,
        payee_name: "Pedágio",
      }).success,
    ).toBe(false);
  });

  it("refuses repeated spaces inside a line and an impossible day", () => {
    expect(
      createAccountPayableSchema.safeParse({
        ...valid,
        description: "Troca  de pneus",
      }).success,
    ).toBe(false);
    expect(
      createAccountPayableSchema.safeParse({ ...valid, due_date: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});
