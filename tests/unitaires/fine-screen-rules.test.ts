import { describe, expect, it } from "vitest";

import { countWithShare, fineCardsData } from "@/features/fine/lib/stats";
import { FINE_TABLE, fineListQuery } from "@/features/fine/lib/server-table";
import { resolveFineBusinessId } from "@/features/fine/lib/scope";
import {
  fineFormSchema,
  localDayKey,
} from "@/features/fine/lib/fine-form-schema";
import {
  fineFormFields,
  initialFineFormState,
  isFineFormDirty,
  pointsAfterCodePick,
} from "@/features/fine/lib/form-state";
import { RESERVED_PARAMS } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

import type { FineRow } from "@/features/fine/lib/types";

/**
 * The rules of the unified fines screen (decision 8.7): one implementation
 * for /admin and /dashboard, where two copies had drifted.
 */

const COMPANY = "018f0000-0000-7000-8000-00000000000a";
const OTHER = "018f0000-0000-7000-8000-00000000000b";

const fine: FineRow = {
  id: "018f0000-0000-7000-8000-0000000000f1",
  status: "PENDING",
  violation_date: "2026-09-10T03:00:00.000Z",
  due_date: "2026-10-10T03:00:00.000Z",
  payment_date: null,
  violation_day: "2026-09-10",
  due_day: "2026-10-10",
  payment_day: null,
  amount: 293.47,
  points: 4,
  location: "Av. Brasil, 1000",
  observation: null,
  businessId: COMPANY,
  branchId: "018f0000-0000-7000-8000-0000000001a1",
  driverId: "018f0000-0000-7000-8000-0000000002a1",
  vehicleId: "018f0000-0000-7000-8000-0000000003a1",
  trafficViolationCodeId: "018f0000-0000-7000-8000-0000000004a1",
  latitude: -23.55,
  longitude: -46.63,
  location_source: "USER_MANUAL",
  created_from: "WEB_DASHBOARD",
  created_at: "2026-09-10T12:00:00.000Z",
  updated_at: "2026-09-10T12:00:00.000Z",
  branch: { corporate_reason: "Filial Centro" },
  driver: { name: "Zeca", cpf: "12345678901" },
  vehicle: { license_plate: "FNE1A01", description: "Caminhão" },
  trafficViolationCode: {
    code: "7455",
    sub_code: 0,
    description: "Velocidade",
    gravity: "MEDIUM",
    points: 4,
  },
};

describe("the cards", () => {
  it("read the server's counts, and zero when it sent none", () => {
    expect(
      fineCardsData({ total: 12, paid: 4, pending: 4, overdue: 4 }),
    ).toMatchObject({
      total: 12,
      paid: 4,
      totalAmount: 0,
    });
    expect(fineCardsData(undefined)).toEqual({
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      openAmount: 0,
    });
  });

  it("show the share of the company's total, not of the page", () => {
    expect(countWithShare(4, 12)).toBe("4 (33%)");
    expect(countWithShare(0, 0)).toBe("0");
  });
});

describe("the server-side table", () => {
  it("forwards only the sorts and filters the API accepts", () => {
    expect(
      fineListQuery({
        sort: "amount",
        order: "desc",
        status: "OVERDUE,CANCELLED",
        branchId: `${COMPANY},not-an-id`,
        trafficViolationCodeId: OTHER,
      }),
    ).toEqual({
      sort: "amount",
      order: "desc",
      status: "OVERDUE",
      branchId: COMPANY,
      trafficViolationCodeId: OTHER,
    });

    expect(fineListQuery({ sort: "observation" })).toEqual({});
  });

  it("uses no param the page already owns", () => {
    for (const facet of Object.values(FINE_TABLE.facets)) {
      expect(RESERVED_PARAMS).not.toContain(facet.param);
    }
  });
});

describe("which company the screen works on", () => {
  it("on /admin is the one picked in the selector, and only a company id", () => {
    expect(resolveFineBusinessId("admin", COMPANY, OTHER)).toBe(COMPANY);
    expect(resolveFineBusinessId("admin", "../../x", OTHER)).toBeUndefined();
    expect(resolveFineBusinessId("admin", null, OTHER)).toBeUndefined();
  });

  it("on /dashboard is the session's, whatever the URL says", () => {
    expect(resolveFineBusinessId("dashboard", OTHER, COMPANY)).toBe(COMPANY);
    expect(resolveFineBusinessId("dashboard", OTHER, null)).toBeUndefined();
  });
});

describe("the form's rules (mirrored from the API)", () => {
  const today = new Date();
  const daysFromToday = (days: number) => {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + days,
    );
    return date.toISOString();
  };

  const valid = {
    violation_date: daysFromToday(-10),
    due_date: daysFromToday(20),
    payment_date: "",
    amount: "R$ 293,47",
    points: "4",
    location: "",
    observation: "",
    branchId: fine.branchId,
    driverId: fine.driverId,
    vehicleId: fine.vehicleId,
    trafficViolationCodeId: fine.trafficViolationCodeId,
    latitude: "",
    longitude: "",
  };

  it("accepts the address as the notice prints it and a multiline note", () => {
    const parsed = fineFormSchema.parse({
      ...valid,
      location: "Av. Brasil, 1000 - Centro/SP",
      observation: "Radar móvel.\n\nRecebida pelos Correios.",
    });

    expect(parsed.location).toBe("Av. Brasil, 1000 - Centro/SP");
    expect(parsed.amount).toBe(293.47);
  });

  it("reads a dot as the decimal point when there is no comma", () => {
    expect(fineFormSchema.parse({ ...valid, amount: "293.47" }).amount).toBe(
      293.47,
    );
    expect(fineFormSchema.parse({ ...valid, amount: "1.234,56" }).amount).toBe(
      1234.56,
    );
  });

  it("takes zero points", () => {
    expect(fineFormSchema.parse({ ...valid, points: "0" }).points).toBe(0);
  });

  it("says what the API says about the dates", () => {
    const issues = (data: Record<string, string>) =>
      fineFormSchema
        .safeParse({ ...valid, ...data })
        .error?.issues.map((issue) => issue.message);

    expect(
      issues({ violation_date: daysFromToday(1), due_date: daysFromToday(30) }),
    ).toContain("A data da infração não pode ser futura.");
    expect(issues({ due_date: valid.violation_date })).toContain(
      "A data de vencimento deve ser posterior à data da infração.",
    );
    expect(issues({ payment_date: daysFromToday(1) })).toContain(
      "A data de pagamento não pode ser futura.",
    );
    expect(issues({ payment_date: daysFromToday(-11) })).toContain(
      "A data de pagamento não pode ser anterior à data da infração.",
    );
  });

  it("keys an instant on this process's clock, and a day as it is", () => {
    expect(localDayKey(new Date(2026, 8, 28, 23, 30))).toBe("2026-09-28");
    // Read as an instant, "2026-09-30" is UTC midnight: the 29th west of UTC.
    expect(localDayKey("2026-09-30")).toBe("2026-09-30");
  });

  it("takes the days the picker gives, and refuses one that does not exist", () => {
    const key = (days: number) => localDayKey(daysFromToday(days));

    expect(
      fineFormSchema.safeParse({
        ...valid,
        violation_date: key(-10),
        due_date: key(20),
        payment_date: key(-1),
      }).success,
    ).toBe(true);

    expect(
      fineFormSchema.safeParse({
        ...valid,
        violation_date: key(1),
        due_date: key(30),
      }).error?.issues[0]?.message,
    ).toBe("A data da infração não pode ser futura.");

    // new Date("2027-02-30") is 2 March: it used to pass.
    expect(
      fineFormSchema.safeParse({ ...valid, due_date: "2027-02-30" }).error
        ?.issues[0]?.message,
    ).toBe("A data de vencimento é inválida.");
  });
});

describe("the edit form", () => {
  it("starts from the fine and is not dirty until something changes", () => {
    const state = initialFineFormState(fine);

    expect(state.amount).toMatch(/293,47/);
    expect(isFineFormDirty(fine, state)).toBe(false);
  });

  it("sees the same amount however it is spelled", () => {
    const state = { ...initialFineFormState(fine), amount: "293,47" };

    expect(isFineFormDirty(fine, state)).toBe(false);
  });

  it("edits the company's days, not the instants read in the viewer's zone", () => {
    // A Manaus company: 03:30 UTC of the 10th is still the 9th there.
    const manaus: FineRow = {
      ...fine,
      violation_date: "2026-09-10T03:30:00.000Z",
      violation_day: "2026-09-09",
      payment_date: "2026-09-12T04:00:00.000Z",
      payment_day: "2026-09-12",
    };

    const state = initialFineFormState(manaus);

    expect(state).toMatchObject({
      violation_date: "2026-09-09",
      due_date: "2026-10-10",
      payment_date: "2026-09-12",
    });
    expect(isFineFormDirty(manaus, state)).toBe(false);
    expect(
      isFineFormDirty(manaus, { ...state, violation_date: "2026-09-10" }),
    ).toBe(true);
    expect(fineFormFields(state, COMPANY)).toMatchObject({
      violation_date: "2026-09-09",
      payment_date: "2026-09-12",
    });
  });

  it("is dirty when a field, a pick or the point changes", () => {
    const base = initialFineFormState(fine);

    expect(isFineFormDirty(fine, { ...base, points: "5" })).toBe(true);
    expect(isFineFormDirty(fine, { ...base, driverId: OTHER })).toBe(true);
    expect(
      isFineFormDirty(fine, { ...base, latitude: null, longitude: null }),
    ).toBe(true);
    expect(isFineFormDirty(fine, { ...base, payment_date: fine.due_day })).toBe(
      true,
    );
  });

  it("suggests the code's points without overwriting what was typed", () => {
    expect(pointsAfterCodePick("", null, 4)).toBe("4");
    // Another code replaces its own earlier suggestion.
    expect(pointsAfterCodePick("4", "4", 7)).toBe("7");
    // A typed value, or the one an edit loaded, stays.
    expect(pointsAfterCodePick("5", "4", 7)).toBe("5");
    expect(pointsAfterCodePick("4", null, 0)).toBe("4");
    expect(pointsAfterCodePick("", null, undefined)).toBe("");
  });

  it("sends a removed point as empty, so the API clears it", () => {
    const fields = fineFormFields(
      { ...initialFineFormState(fine), latitude: null, longitude: null },
      COMPANY,
    );

    expect(fields).toMatchObject({
      businessId: COMPANY,
      latitude: "",
      longitude: "",
    });
  });
});
