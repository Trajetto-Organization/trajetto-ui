import { describe, expect, it } from "vitest";

import { createUpdateServiceOrderSchema } from "@/schemas/create-update-service-order-schema";

/**
 * A vehicle's first service order.
 *
 * "Quilometragem da última revisão" is optional on the vehicle (its column is
 * nullable, the vehicle form says "(opcional)"), and for anyone but a MASTER
 * the order form shows it as a read-only copy of the vehicle. The order
 * schema required it, so a vehicle that never had a review could not get its
 * first order from a manager or an employee: the field was empty, could not
 * be typed in, and the form answered "A quilometragem da última revisão é
 * obrigatória." Found by tests/ui/journey-fleet.spec.ts driving the form.
 */
const ORDER = {
  date: "2026-10-06T03:00:00.000Z",
  maintenance_type: "EXTERNAL",
  total_amount: "1.850,40",
  current_mileage_at_service: "50420",
  maintenance_interval_km_at_service: "10000",
  vehicleId: "018f0000-0000-7000-8000-000000000001",
  responsibleUserId: "018f0000-0000-7000-8000-000000000002",
  branchId: "018f0000-0000-7000-8000-000000000003",
};

describe("the service order of a vehicle that never had maintenance", () => {
  it("is accepted without the last maintenance mileage", () => {
    const parsed = createUpdateServiceOrderSchema.safeParse({
      ...ORDER,
      last_maintenance_mileage_at_service: "",
    });

    expect(
      parsed.success,
      JSON.stringify(parsed.error?.flatten().fieldErrors),
    ).toBe(true);
    expect(
      parsed.success && parsed.data.last_maintenance_mileage_at_service,
    ).toBeUndefined();
  });

  it("and the existing rule still holds: the maintenance does not go past the current mileage", () => {
    const parsed = createUpdateServiceOrderSchema.safeParse({
      ...ORDER,
      last_maintenance_mileage_at_service: "60000",
    });

    expect(parsed.success).toBe(false);
    expect(
      parsed.error?.flatten().fieldErrors
        .last_maintenance_mileage_at_service?.[0],
    ).toMatch(/não pode ser superior/);
  });
});
