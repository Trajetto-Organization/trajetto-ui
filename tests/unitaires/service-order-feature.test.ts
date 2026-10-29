import { describe, expect, it } from "vitest";

import {
  deleteBlockedReason,
  isMileageAccepted,
  MAINTENANCE_TYPE_LABELS,
  partsExceedTotal,
  serviceOrderStatusOf,
} from "@/features/service-order/lib/service-order-rules";
import { serviceOrderStatsData } from "@/features/service-order/lib/stats-data";
import {
  orderFieldsChanged,
  toFieldValues,
} from "@/features/service-order/update-form/dirty";
import {
  SERVICE_ORDER_TABLE,
  serviceOrderListQuery,
  type ServiceOrderRow,
} from "@/features/service-order/server-table";

/**
 * The unified service order screen's rules (decision 8.7): one status, the
 * labels of the maintenance type, the parts-over-total warning, the delete
 * guard's explanation, the same-mileage rule, the cards read from the
 * server, the edit form's dirty state and the URL → API query.
 */

const ORDER: ServiceOrderRow = {
  id: "018f0000-0000-7000-8000-000000000001",
  date: "2026-09-20T12:00:00.000Z",
  completion_date: null,
  maintenance_type: "INTERNAL",
  total_amount: 100,
  description: "Troca de óleo",
  current_mileage_at_service: 120000,
  maintenance_interval_km_at_service: 10000,
  last_maintenance_mileage_at_service: 110000,
  new_mileage_after_service: null,
  businessId: "018f0000-0000-7000-8000-00000000000b",
  vehicleId: "v1",
  responsibleUserId: "u1",
  branchId: "b1",
  supplierId: null,
  latitude: null,
  longitude: null,
  created_from: "WEB_DASHBOARD",
  created_at: "2026-09-20T12:00:00.000Z",
  updated_at: "2026-09-20T12:00:00.000Z",
  parts_total: 230,
  parts_count: 2,
  accounts_payable_count: 0,
};

describe("the order's status and labels", () => {
  it("is open until there is a completion date", () => {
    expect(serviceOrderStatusOf(ORDER)).toBe("open");
    expect(serviceOrderStatusOf({ completion_date: "2026-09-21" })).toBe(
      "completed",
    );
  });

  it("names the type by where the work is done, not preventive/corrective", () => {
    expect(MAINTENANCE_TYPE_LABELS).toEqual({
      INTERNAL: "Interna",
      EXTERNAL: "Externa",
    });
    expect(Object.values(MAINTENANCE_TYPE_LABELS).join(" ")).not.toMatch(
      /preventiva|corretiva/i,
    );
  });
});

describe("the parts over the typed total (FLEET-SO-2)", () => {
  it("warns only when the parts alone pass the total", () => {
    expect(partsExceedTotal(ORDER)).toBe(true);
    expect(partsExceedTotal({ total_amount: "230.00", parts_total: 230 })).toBe(
      false,
    );
    expect(partsExceedTotal({ total_amount: 230, parts_total: 230.004 })).toBe(
      false,
    );
    expect(partsExceedTotal({ total_amount: 500 })).toBe(false);
  });
});

describe("why an order may not be deleted (FLEET-SO-1)", () => {
  it("names the bills first, then the finished order, else nothing", () => {
    expect(
      deleteBlockedReason({ ...ORDER, accounts_payable_count: 2 }),
    ).toMatch(/2 conta\(s\) a pagar/);
    expect(
      deleteBlockedReason({ ...ORDER, completion_date: "2026-09-21" }),
    ).toMatch(/concluída/);
    expect(deleteBlockedReason(ORDER)).toBeNull();
  });
});

describe("the mileage a finished order records (FLEET-SO-4)", () => {
  it("accepts the odometer's own reading, refuses one behind it", () => {
    expect(isMileageAccepted("120000", 120000)).toBe(true);
    expect(isMileageAccepted("120000,5", 120000)).toBe(true);
    expect(isMileageAccepted("119999", 120000)).toBe(false);
    expect(isMileageAccepted("", 120000)).toBe(true);
  });
});

describe("the cards", () => {
  it("read only the server's searchMeta", () => {
    expect(
      serviceOrderStatsData({
        total: 150,
        open: 40,
        completed: 110,
        totalAmount: 1234.5,
      }),
    ).toEqual({
      totalServiceOrders: 150,
      openOrders: 40,
      completedOrders: 110,
      totalAmount: expect.stringMatching(/R\$\s1\.234,50/),
    });
  });

  it("show zeros, never the page's count, without it", () => {
    expect(serviceOrderStatsData(undefined)).toMatchObject({
      totalServiceOrders: 0,
      openOrders: 0,
      completedOrders: 0,
    });
  });
});

describe("the edit form's dirty state (decision 2.5)", () => {
  const original = toFieldValues(ORDER);

  it("is clean as opened, even with the same instant written another way", () => {
    expect(
      orderFieldsChanged(original, original, { includeSnapshot: true }),
    ).toBe(false);
    expect(
      orderFieldsChanged(
        original,
        {
          ...original,
          date: "2026-09-20T09:00:00.000-03:00",
          total_amount: "100,00",
        },
        { includeSnapshot: false },
      ),
    ).toBe(false);
  });

  it("notices a real change", () => {
    expect(
      orderFieldsChanged(
        original,
        { ...original, total_amount: "R$ 150,00" },
        { includeSnapshot: false },
      ),
    ).toBe(true);
    expect(
      orderFieldsChanged(
        original,
        { ...original, description: "Freios" },
        { includeSnapshot: false },
      ),
    ).toBe(true);
  });

  it("counts the snapshot only for whoever may edit it", () => {
    const changed = { ...original, current_mileage_at_service: "120500" };

    expect(
      orderFieldsChanged(original, changed, { includeSnapshot: false }),
    ).toBe(false);
    expect(
      orderFieldsChanged(original, changed, { includeSnapshot: true }),
    ).toBe(true);
  });
});

describe("the URL the table writes and the API reads", () => {
  it("forwards sort and the three facets, dropping what the API refuses", () => {
    expect(
      serviceOrderListQuery({
        sort: "total_amount",
        order: "desc",
        status: "open",
        maintenanceType: "INTERNAL,BOGUS",
        branchId: "018f0000-0000-7000-8000-0000000000aa",
        page: "2",
      }),
    ).toEqual({
      sort: "total_amount",
      order: "desc",
      status: "open",
      maintenanceType: "INTERNAL",
      branchId: "018f0000-0000-7000-8000-0000000000aa",
    });
  });

  it("does not sort by a column the API cannot order", () => {
    expect(serviceOrderListQuery({ sort: "description" })).toEqual({});
    expect(SERVICE_ORDER_TABLE.sortable).not.toContain("parts_total");
  });
});
