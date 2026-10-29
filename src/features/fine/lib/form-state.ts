import { parseAmount } from "./fine-form-schema";
import type { FineRow } from "./types";

/**
 * What the fine form holds, apart from React so the create and the edit —
 * which were two copies in /admin and two in /dashboard — share one set of
 * rules: where the fields start, whether an edit changed anything (decision
 * 2.5: Salvar stays disabled until it did) and what goes to the action.
 */
interface FineFormState {
  branchId: string;
  vehicleId: string;
  driverId: string;
  trafficViolationCodeId: string;
  /** Days ("YYYY-MM-DD"): the picker works on days, the API stores the day's start. */
  violation_date: string;
  due_date: string;
  payment_date: string;
  /** As typed or as shown ("R$ 293,47"). */
  amount: string;
  points: string;
  location: string;
  observation: string;
  latitude: number | null;
  longitude: number | null;
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatAmountInput(value: number): string {
  return BRL.format(value);
}

function initialFineFormState(fine?: FineRow): FineFormState {
  if (!fine) {
    return {
      branchId: "",
      vehicleId: "",
      driverId: "",
      trafficViolationCodeId: "",
      violation_date: "",
      due_date: "",
      payment_date: "",
      amount: "",
      points: "",
      location: "",
      observation: "",
      latitude: null,
      longitude: null,
    };
  }

  return {
    branchId: fine.branchId,
    vehicleId: fine.vehicleId,
    driverId: fine.driverId,
    trafficViolationCodeId: fine.trafficViolationCodeId,
    // The company's days as the API names them, never the instants read in
    // the viewer's zone (São Paulo midnight is still the day before in Manaus).
    violation_date: fine.violation_day,
    due_date: fine.due_day,
    payment_date: fine.payment_day ?? "",
    amount: formatAmountInput(Number(fine.amount)),
    points: String(fine.points),
    location: fine.location ?? "",
    observation: fine.observation ?? "",
    latitude: fine.latitude ?? null,
    longitude: fine.longitude ?? null,
  };
}

/**
 * Whether the edit changed anything the API would store. The amount is
 * compared as a number ("R$ 293,47" and "293,47" are the same value) and
 * text fields as trimmed text.
 */
function isFineFormDirty(fine: FineRow, state: FineFormState): boolean {
  const original = initialFineFormState(fine);

  const amount = (value: string) => {
    const parsed = parseAmount(value);
    return typeof parsed === "number" ? parsed : Number.NaN;
  };

  return (
    state.branchId !== original.branchId ||
    state.vehicleId !== original.vehicleId ||
    state.driverId !== original.driverId ||
    state.trafficViolationCodeId !== original.trafficViolationCodeId ||
    state.violation_date !== original.violation_date ||
    state.due_date !== original.due_date ||
    state.payment_date !== original.payment_date ||
    !Object.is(amount(state.amount), amount(original.amount)) ||
    state.points.trim() !== original.points ||
    state.location.trim() !== original.location ||
    state.observation.trim() !== original.observation ||
    state.latitude !== original.latitude ||
    state.longitude !== original.longitude
  );
}

/**
 * The fields as the server action reads them from the FormData. An empty
 * coordinate is sent as "" so the edit can remove a point (the API reads it
 * as null).
 */
function fineFormFields(
  state: FineFormState,
  businessId: string,
): Record<string, string> {
  return {
    businessId,
    branchId: state.branchId,
    vehicleId: state.vehicleId,
    driverId: state.driverId,
    trafficViolationCodeId: state.trafficViolationCodeId,
    violation_date: state.violation_date,
    due_date: state.due_date,
    payment_date: state.payment_date,
    amount: state.amount,
    points: state.points,
    location: state.location,
    observation: state.observation,
    latitude: state.latitude === null ? "" : String(state.latitude),
    longitude: state.longitude === null ? "" : String(state.longitude),
  };
}

/**
 * The points field after a code is picked: the code's points while the
 * field is empty or still holds the previous code's suggestion; what the
 * person typed (or an edit loaded) is kept.
 */
function pointsAfterCodePick(
  currentPoints: string,
  lastSuggested: string | null,
  codePoints: number | undefined,
): string {
  if (typeof codePoints !== "number") return currentPoints;

  const untouched = currentPoints === "" || currentPoints === lastSuggested;

  return untouched ? String(codePoints) : currentPoints;
}

export {
  fineFormFields,
  formatAmountInput,
  initialFineFormState,
  isFineFormDirty,
  pointsAfterCodePick,
  type FineFormState,
};
