import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as idempotency from "@/lib/idempotency-key";

/**
 * A panel form's Idempotency-Key follows WHAT it sends, not only whether the
 * last save succeeded (IDEMP-14 review).
 *
 * The fine, bill and service-order create forms live in the component that
 * also renders their trigger button, so they stay mounted while the dialog is
 * closed and opened again. With the key renewed only after a success, a save
 * whose answer was lost (the API committed, the action showed an error) left
 * the key in place: the NEXT record typed into that form — another vehicle,
 * another amount — went out with the same key, and the API answered with the
 * first record as a success. The second fine was never created, and the
 * panel said it was.
 *
 * Same content, same key (the resend the key exists for); anything changed,
 * a new key — the rule the chat broadcast and the web occurrence already
 * follow.
 */
type SubmissionKey = { key: string; fingerprint: string };

type KeyForSubmission = (
  previous: SubmissionKey | null,
  payload: FormData,
) => SubmissionKey;

const keyForSubmission = (idempotency as Record<string, unknown>)
  .keyForSubmission as KeyForSubmission;

function fineForm(fields: Record<string, string>): FormData {
  const form = new FormData();

  for (const [name, value] of Object.entries(fields)) form.append(name, value);

  return form;
}

const FINE_A = {
  businessId: "b-1",
  vehicleId: "vehicle-1",
  amount: "195.23",
  infraction_date: "2026-09-20",
};

describe("the key a create form sends", () => {
  it("is the same when the form sends the same content again", () => {
    const first = keyForSubmission(null, fineForm(FINE_A));
    const resend = keyForSubmission(first, fineForm(FINE_A));

    expect(resend.key).toBe(first.key);
  });

  it("is a new one when anything in the content changed", () => {
    const first = keyForSubmission(null, fineForm(FINE_A));

    const otherVehicle = keyForSubmission(
      first,
      fineForm({ ...FINE_A, vehicleId: "vehicle-2" }),
    );
    const otherAmount = keyForSubmission(
      first,
      fineForm({ ...FINE_A, amount: "293.47" }),
    );

    expect(otherVehicle.key).not.toBe(first.key);
    expect(otherAmount.key).not.toBe(first.key);
  });

  it("does not count the key it carries as content", () => {
    const first = keyForSubmission(null, fineForm(FINE_A));

    const withKey = fineForm(FINE_A);
    withKey.set("idempotency_key", first.key);

    expect(keyForSubmission(first, withKey).key).toBe(first.key);
  });

  it("is a UUID the action forwards as the header", () => {
    const { key } = keyForSubmission(null, fineForm(FINE_A));

    expect(idempotency.idempotencyHeaderOf(key)).toEqual({
      "Idempotency-Key": key,
    });
  });
});

describe("the panel's create forms", () => {
  const SOURCE = resolve(__dirname, "../../src");

  const forms = [
    "features/fine/form-dialog/index.tsx",
    // One form for /admin and /dashboard since decision 8.7.
    "features/account-payable/form-dialog/index.tsx",
    "features/service-order/create-form/index.tsx",
    "features/deliveries/deliveries/form-dialog/index.tsx",
  ];

  it.each(forms)("%s derives the key from the form data it sends", (path) => {
    const source = readFileSync(resolve(SOURCE, path), "utf8");

    // The key is asked for with the very FormData being dispatched, after
    // everything else was appended to it.
    expect(source).toMatch(
      /(\w+)\.set\(\s*"idempotency_key",\s*idempotencyKeyFor\(\1\),?\s*\)/,
    );
  });
});
