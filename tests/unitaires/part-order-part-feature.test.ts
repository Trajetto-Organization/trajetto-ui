import { describe, expect, it } from "vitest";

import {
  partDeleteBlockedReason,
  partStatsData,
} from "@/features/part/lib/part-rules";
import { partListQuery, PART_TABLE } from "@/features/part/server-table";

import {
  lineTotals,
  orderPartStatsData,
} from "@/features/service-order/order-parts/lib/order-part-rules";
import {
  orderPartListQuery,
  ORDER_PART_TABLE,
} from "@/features/service-order/order-parts/server-table";

/**
 * The unified parts and order-parts screens (decision 8.7): cards from the
 * server only (8.8), the delete explanation, the line money and the URL →
 * API query.
 */

describe("the parts catalog", () => {
  it("reads its cards from the server, and has no stock card", () => {
    const data = partStatsData({
      total: 12,
      withSupplier: 8,
      withoutSupplier: 4,
      averagePrice: 37.5,
    });

    expect(data).toEqual({
      totalParts: 12,
      withSupplier: 8,
      withoutSupplier: 4,
      averagePrice: expect.stringMatching(/R\$\s37,50/),
    });
    expect(Object.keys(data)).not.toContain("totalValue");
    expect(partStatsData(undefined)).toMatchObject({
      totalParts: 0,
      withSupplier: 0,
    });
  });

  it("explains why a used part stays, and lets an unused one go", () => {
    expect(partDeleteBlockedReason({ service_order_parts_count: 3 })).toMatch(
      /3 lançamento\(s\)/,
    );
    expect(
      partDeleteBlockedReason({ service_order_parts_count: 0 }),
    ).toBeNull();
  });

  it("forwards sort and the supplier facet as the API names them", () => {
    expect(
      partListQuery({
        sort: "unit_price",
        order: "asc",
        supplierId: "018f0000-0000-7000-8000-0000000000c1,not-a-uuid",
      }),
    ).toEqual({
      sort: "unit_price",
      order: "asc",
      supplierId: "018f0000-0000-7000-8000-0000000000c1",
    });
    expect(PART_TABLE.sortable).not.toContain("service_order_parts_count");
  });
});

describe("the order-part lines", () => {
  it("computes a line's money with its discount, in cents", () => {
    expect(
      lineTotals({ unit_price: "100", quantity: 2, discount_percentage: "10" }),
    ).toEqual({
      gross: 200,
      net: 180,
    });
    expect(
      lineTotals({ unit_price: 0.335, quantity: 3, discount_percentage: null }),
    ).toEqual({
      gross: 1.01,
      net: 1.01,
    });
  });

  it("reads its cards from the server, never the page's sums", () => {
    expect(
      orderPartStatsData({
        total: 2,
        withDiscount: 1,
        totalValue: 147,
        averageValue: 73.5,
      }),
    ).toEqual({
      totalItems: 2,
      withDiscount: 1,
      totalValue: expect.stringMatching(/R\$\s147,00/),
      averageValue: expect.stringMatching(/R\$\s73,50/),
    });
  });

  it("forwards one order's filter and the part facet", () => {
    expect(
      orderPartListQuery({
        serviceOrderId: "018f0000-0000-7000-8000-0000000000a1",
        partId: "018f0000-0000-7000-8000-0000000000b2",
        sort: "vehicleLicensePlate",
      }),
    ).toEqual({
      sort: "vehicleLicensePlate",
      order: "asc",
      partId: "018f0000-0000-7000-8000-0000000000b2",
      serviceOrderId: "018f0000-0000-7000-8000-0000000000a1",
    });
    expect(ORDER_PART_TABLE.sortable).not.toContain("totalWithDiscount");
  });
});
