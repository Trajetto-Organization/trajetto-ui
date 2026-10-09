import { afterEach, describe, expect, it, vi } from "vitest";

import {
  birthDateIssue,
  birthDateKeyOf,
  changedDriverFields,
  cnhExpiryIssue,
  countWithShare,
  dateOnlyKeyOf,
  driverFormValuesOf,
  driverStatsData,
  hasTurned,
  scopedDriverBusinessId,
} from "@/features/driver/lib/driver-rules";
import { driverStats } from "@/features/driver/lib/stats-config";
import { DRIVER_TABLE, driverListQuery } from "@/features/driver/server-table";
import { createUpdateDriverSchema } from "@/schemas/create-update-driver-schema";

/**
 * The driver screen's logic, one implementation for /admin and /dashboard
 * (decision 8.7): which company it acts on, what the cards say, which URL
 * params reach the API, when Save is enabled and what the form accepts.
 */
const BUSINESS = "018f0000-0000-7000-8000-00000000000b";

describe("scopedDriverBusinessId", () => {
  it("reads the selector's company on /admin and never the session's", () => {
    expect(scopedDriverBusinessId("admin", BUSINESS, "session-id")).toBe(
      BUSINESS,
    );
    expect(scopedDriverBusinessId("admin", null, "session-id")).toBeUndefined();
  });

  it("refuses anything but an id in the URL (it becomes an API path segment)", () => {
    expect(scopedDriverBusinessId("admin", "../../user", "x")).toBeUndefined();
  });

  it("reads the session's company on /dashboard, whatever the URL says", () => {
    expect(scopedDriverBusinessId("dashboard", BUSINESS, "session-id")).toBe(
      "session-id",
    );
    expect(scopedDriverBusinessId("dashboard", BUSINESS, null)).toBeUndefined();
  });
});

describe("driverStatsData", () => {
  it("maps the server's searchMeta to the cards, never counting rows", () => {
    expect(
      driverStatsData({
        total: 12,
        active: 9,
        inactive: 3,
        owned: 2,
        thirdParty: 1,
      }),
    ).toEqual({
      totalDrivers: 12,
      activeDrivers: 9,
      inactiveDrivers: 3,
      ownedDrivers: 2,
      contractTotal: 3,
    });
  });

  it("leaves every card unknown when the API sent no numbers", () => {
    expect(driverStatsData(undefined)).toEqual({
      totalDrivers: undefined,
      activeDrivers: undefined,
      inactiveDrivers: undefined,
      ownedDrivers: undefined,
      contractTotal: undefined,
    });
  });

  it("shows a share, a zero or a dash, never a confident zero for an unknown", () => {
    expect(countWithShare(9, 12)).toBe("9 (75%)");
    expect(countWithShare(0, 0)).toBe("0");
    expect(countWithShare(undefined, 12)).toBe("—");
  });
});

describe("DRIVER_TABLE → the API query", () => {
  it("forwards sort, order and each facet under the API's param names", () => {
    const query = driverListQuery({
      sort: "cnh_expires_at",
      order: "desc",
      status: "INACTIVE,ACTIVE",
      cnh_category: ["E", "NONE"],
      branchId: BUSINESS,
      page: "3",
    });

    expect(query).toEqual({
      sort: "cnh_expires_at",
      order: "desc",
      status: "INACTIVE,ACTIVE",
      cnh_category: "E,NONE",
      branchId: BUSINESS,
    });
  });

  it("drops what the API would refuse: an unknown sort, value or id", () => {
    expect(
      driverListQuery({
        sort: "cpf",
        status: "BLOCKED",
        branchId: "not-an-id",
      }),
    ).toEqual({});
  });

  it("lets only the columns the API orders by sort", () => {
    expect(DRIVER_TABLE.sortable).not.toContain("cpf");
    expect(DRIVER_TABLE.sortable).toContain("cnh_category");
    // The branch filter sits on the branch NAME column but sends ids.
    expect(DRIVER_TABLE.facets.branchName).toEqual({
      param: "branchId",
      values: "uuid",
    });
  });
});

const STORED = {
  name: "Joana Motorista",
  birth_date: "1990-05-10T03:00:00.000Z",
  cpf: "52998224725",
  rg: "123456789",
  cnh: "12345678901",
  cnh_category: null,
  cnh_expires_at: "2030-03-17T00:00:00.000Z",
  status: "ACTIVE",
  contract_type: "OWNED",
  cep: "01001000",
  city: "São Paulo",
  uf: "SP",
  street: "Rua das Flores",
  address_number: "10",
  complement: null,
  branchId: null,
};

describe("changedDriverFields (Save disabled while nothing changed, decision 2.5)", () => {
  const original = driverFormValuesOf(STORED);

  it("reads the stored expiry and birth date as their civil days and blanks as empty", () => {
    expect(original.cnh_expires_at).toBe("2030-03-17");
    // The form's birth date field is date-only now: the old form's local
    // midnight (03:00Z) is that same day.
    expect(original.birth_date).toBe("1990-05-10");
    expect(original.cnh_category).toBe("");
    expect(original.complement).toBe("");
  });

  it("sees no change in the same values spelled through masks", () => {
    expect(
      changedDriverFields(original, {
        ...original,
        cpf: "529.982.247-25",
        rg: "12.345.678-9",
        cep: "01001-000",
        cnh_category: "NONE",
        uf: "sp",
        // The same day re-picked in the date field.
        birth_date: "1990-05-10T03:00:00.000Z",
      }),
    ).toEqual([]);
  });

  it("names each field that really changed, the branch included", () => {
    expect(
      changedDriverFields(original, {
        ...original,
        cnh_expires_at: "2031-03-17",
        status: "INACTIVE",
        branchId: BUSINESS,
      }),
    ).toEqual(["cnh_expires_at", "status", "branchId"]);
  });
});

describe("dateOnlyKeyOf", () => {
  it("keeps the civil day of a UTC-midnight value, in any browser zone", () => {
    expect(dateOnlyKeyOf("2026-09-17T00:00:00.000Z")).toBe("2026-09-17");
    expect(dateOnlyKeyOf("2026-09-17")).toBe("2026-09-17");
    expect(dateOnlyKeyOf(null)).toBe("");
  });
});

describe("cnhExpiryIssue (mirrors the API)", () => {
  it("accepts a past date and ten years ahead, refuses a typo beyond", () => {
    expect(cnhExpiryIssue("2020-01-01", "2026-09-28")).toBeNull();
    expect(cnhExpiryIssue("2036-09-28", "2026-09-28")).toBeNull();
    expect(cnhExpiryIssue("2036-09-29", "2026-09-28")).toBe(
      "A validade da CNH não pode passar de 10 anos a partir de hoje.",
    );
    expect(cnhExpiryIssue("2030-02-30", "2026-09-28")).toBe(
      "A validade da CNH não é uma data válida.",
    );
  });
});

describe("createUpdateDriverSchema", () => {
  const valid = {
    name: "Joana Motorista",
    birth_date: "1990-05-10T03:00:00.000Z",
    cnh: "123.456.789-01",
    cpf: "529.982.247-25",
    rg: "12.345.678-9",
    cep: "01001-000",
    city: "São Paulo",
    uf: "SP",
    street: "Rua das Flores",
    address_number: "10",
    status: "ACTIVE",
    contract_type: "OWNED",
  };

  it("sends a blank category and expiry as null, so an edit can clear them", () => {
    const parsed = createUpdateDriverSchema.parse({
      ...valid,
      cnh_category: "NONE",
      cnh_expires_at: "",
    });

    expect(parsed.cnh_category).toBeNull();
    expect(parsed.cnh_expires_at).toBeNull();
    expect(parsed.cnh).toBe("12345678901");
  });

  it("keeps a chosen category and a civil-day expiry", () => {
    const parsed = createUpdateDriverSchema.parse({
      ...valid,
      cnh_category: "AE",
      cnh_expires_at: "2030-03-17",
    });

    expect(parsed).toMatchObject({
      cnh_category: "AE",
      cnh_expires_at: "2030-03-17",
    });
  });

  it("refuses an unknown category and an expiry that is not a civil day", () => {
    const result = createUpdateDriverSchema.safeParse({
      ...valid,
      cnh_category: "F",
      cnh_expires_at: "2030-03-17T10:00:00Z",
    });

    expect(result.success).toBe(false);

    const errors = result.success ? {} : result.error.flatten().fieldErrors;

    expect(errors.cnh_category?.[0]).toContain(
      "A categoria da CNH deve ser uma destas",
    );
    expect(errors.cnh_expires_at?.[0]).toBe(
      "A validade da CNH deve ser uma data no formato AAAA-MM-DD.",
    );
  });
});

describe("the Total card says what searchMeta.total counts", () => {
  it("claims every status, since the status filter is left out of it on purpose", () => {
    const total = driverStats.find((stat) => stat.key === "total-drivers");

    // With status=INACTIVE the card shows 12 beside 3 rows: "nos filtros
    // atuais" was false.
    expect(total?.description).toBe(
      "Todas as situações, na busca e nos demais filtros",
    );
  });
});

describe("the birth date (mirrors the API's civil-day rule)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads a date-only value as the day itself and the old instant on its UTC day", () => {
    expect(birthDateKeyOf("1990-05-10")).toBe("1990-05-10");
    expect(birthDateKeyOf("1990-05-10T03:00:00.000Z")).toBe("1990-05-10");
    expect(birthDateKeyOf("1990-02-30")).toBeNull();
    expect(birthDateKeyOf("10/05/1990")).toBeNull();
  });

  it("turns 18 on the birthday, and on 01/03 for someone born on 29/02", () => {
    expect(hasTurned("2008-09-29", "2026-09-29", 18)).toBe(true);
    expect(hasTurned("2008-09-29", "2026-09-28", 18)).toBe(false);
    expect(hasTurned("2008-02-29", "2026-02-28", 18)).toBe(false);
    expect(hasTurned("2008-02-29", "2026-03-01", 18)).toBe(true);
  });

  it("uses the API's messages", () => {
    expect(birthDateIssue("2008-09-29", "2026-09-28")).toBe(
      "O motorista deve ter pelo menos 18 anos.",
    );
    expect(birthDateIssue("0199-05-10", "2026-09-28")).toBe(
      "A data de nascimento é anterior a 1900. Confira a data.",
    );
    expect(birthDateIssue("x", "2026-09-28")).toBe(
      "Data de nascimento inválida.",
    );
  });

  it("refuses in the form the evening before the 18th birthday, on São Paulo's day", () => {
    // 22:30 on the 28th in São Paulo, already the 29th in UTC. The old check
    // read "2008-09-29" (UTC midnight) with getDate() on the browser's clock:
    // the 28th in Brazil, so it counted the birthday a day early.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-29T01:30:00.000Z"));

    const result = createUpdateDriverSchema.safeParse({
      name: "Joana Motorista",
      birth_date: "2008-09-29",
      cnh: "12345678901",
      cpf: "52998224725",
      rg: "123456789",
      cep: "01001000",
      city: "São Paulo",
      uf: "SP",
      street: "Rua das Flores",
      address_number: "10",
      status: "ACTIVE",
      contract_type: "OWNED",
    });

    expect(result.success).toBe(false);

    const errors = result.success ? {} : result.error.flatten().fieldErrors;

    expect(errors.birth_date?.[0]).toBe(
      "O motorista deve ter pelo menos 18 anos.",
    );
  });
});
