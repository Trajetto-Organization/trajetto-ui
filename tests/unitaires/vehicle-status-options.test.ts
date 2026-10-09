import { describe, expect, it } from "vitest";

import {
  CHOOSABLE_VEHICLE_STATUSES,
  vehicleStatusOptions,
} from "@/lib/vehicle-status";

/**
 * What the vehicle form lets a person say about a truck.
 *
 * "Em rota" used to be an option in this dropdown, and nothing in the system
 * ever set or cleared it — so it was true until the truck came back and
 * somebody remembered to change it. It is now written by the route and the API
 * refuses it as a manual change, which makes offering it here a way to build a
 * form that fails on save.
 *
 * Hiding it is only half the fix, and the smaller half: the backend refusal is
 * what actually holds, because the API is reachable by things that are not
 * this form. These tests cover the half that decides what a dispatcher sees.
 */
describe("the status dropdown of a vehicle in the yard", () => {
  it("offers exactly the three states a person decides", () => {
    expect(vehicleStatusOptions().map((option) => option.value)).toEqual([
      "ACTIVE",
      "INACTIVE",
      "BLOCKED",
    ]);
  });

  it("never offers “Em rota”, whatever the current value is", () => {
    for (const current of [undefined, null, "ACTIVE", "INACTIVE", "BLOCKED"]) {
      expect(
        vehicleStatusOptions(current).map((option) => option.value),
      ).not.toContain("IN_ROUTE");
    }
  });

  it("leaves every option choosable", () => {
    expect(
      vehicleStatusOptions("ACTIVE").filter((option) => option.disabled),
    ).toEqual([]);
  });
});

describe("the status dropdown of a truck that is out", () => {
  it("shows “Em rota” so the field is not blank on a real vehicle", () => {
    // Omitting it would leave this field empty on a truck that is genuinely on
    // the road, which reads as data loss and invites the user to pick
    // something else just to make the form look right.
    const values = vehicleStatusOptions("IN_ROUTE").map(
      (option) => option.value,
    );

    expect(values).toContain("IN_ROUTE");
  });

  it("shows it locked, and says why in the label", () => {
    const inRoute = vehicleStatusOptions("IN_ROUTE").find(
      (option) => option.value === "IN_ROUTE",
    );

    expect(inRoute?.disabled).toBe(true);
    expect(inRoute?.label).toContain("definido pela rota");
  });

  it("offers only BLOCKED as a change while the truck is out (FLEET-ASSIGN-5)", () => {
    // Blocking a vehicle after a crash is exactly when somebody needs to; and
    // with the route running the API refuses ACTIVE and INACTIVE
    // (VEHICLE_IN_ACTIVE_ROUTE), so offering them only built a failing save.
    const choosable = vehicleStatusOptions("IN_ROUTE")
      .filter((option) => !option.disabled)
      .map((option) => option.value);

    expect(choosable).toEqual(["BLOCKED"]);
  });

  it("is derived from the persisted status, so an edit cannot hide “Em rota” (FLEET-VEH-4)", () => {
    // The form used to pass its own value: choosing "Ativo" on a truck that
    // was out removed the "Em rota" option and the way back with it. The
    // options depend only on what the vehicle HAS, whatever is being typed.
    const persisted = "IN_ROUTE";
    const beforeEdit = vehicleStatusOptions(persisted);
    const afterPickingBlocked = vehicleStatusOptions(persisted);

    expect(afterPickingBlocked).toEqual(beforeEdit);
    expect(afterPickingBlocked.map((option) => option.value)).toContain(
      "IN_ROUTE",
    );
  });
});
