import { formatToBrazilianCurrency } from "@/lib/format-values";

import type { AccountPayableRow } from "./server-table";

/**
 * The bill form's values, in the shape the inputs hold them: ids, a picked
 * DAY ("YYYY-MM-DD") for each date and money as typed ("R$ 1.234,56").
 *
 * The payee is a registered supplier OR a free-text name (decision 8.4); the
 * form keeps which of the two was chosen so switching back and forth does
 * not lose what was typed, and only the chosen one is sent.
 *
 * No directive: pure, and tested without rendering the dialog.
 */
type PayeeKind = "supplier" | "name";

interface AccountPayableFormValues {
  branchId: string;
  registrationUserId: string;
  category: string;
  category_description: string;
  payeeKind: PayeeKind;
  supplierId: string;
  payee_name: string;
  vehicleId: string;
  serviceOrderId: string;
  due_date: string;
  payment_date: string;
  amount: string;
  amount_paid: string;
  document_number: string;
  description: string;
}

const money = (value: number | null | undefined): string =>
  value === null || value === undefined ? "" : formatToBrazilianCurrency(value);

/**
 * What the profile may read for the form's optional pickers. Each one lists
 * another section (supplier_manage, vehicle_manage or dispatch,
 * service_order_manage); without it the list answered 403 inside the dialog
 * and the default payee mode, the supplier picker, could not be used at all.
 */
interface BillFormAccess {
  suppliers: boolean;
  vehicles: boolean;
  serviceOrders: boolean;
}

const FULL_ACCESS: BillFormAccess = {
  suppliers: true,
  vehicles: true,
  serviceOrders: true,
};

/** Why a picker is disabled: said in its hint, never a failing list. */
const NO_ACCESS_HINTS: Record<keyof BillFormAccess, string> = {
  suppliers:
    "Seu perfil não pode ver os fornecedores: informe o favorecido pelo nome.",
  vehicles: "Seu perfil não pode ver os veículos da empresa.",
  serviceOrders: "Seu perfil não pode ver as ordens de serviço da empresa.",
};

/**
 * Whether the bill must name a payee: always to create (decision 8.4); on an
 * edit only when it already names one, since a bill from before the column
 * is edited (a payment registered, say) without inventing a payee.
 */
function isPayeeRequired(
  bill?: Pick<AccountPayableRow, "supplierId" | "payee_name">,
): boolean {
  return !bill || Boolean(bill.supplierId || bill.payee_name);
}

/** What the form opens with: empty to create, the bill to edit. */
function initialFormValues(
  bill?: AccountPayableRow,
  access: BillFormAccess = FULL_ACCESS,
): AccountPayableFormValues {
  return {
    branchId: bill?.branchId ?? "",
    registrationUserId: bill?.registrationUserId ?? "",
    category: bill?.category ?? "",
    category_description: bill?.category_description ?? "",
    payeeKind: initialPayeeKind(bill, access),
    supplierId: bill?.supplierId ?? "",
    payee_name: bill?.payee_name ?? "",
    vehicleId: bill?.vehicleId ?? "",
    serviceOrderId: bill?.serviceOrderId ?? "",
    // The API's day keys, in the company's zone: the picker shows that day.
    due_date: bill?.due_day ?? "",
    payment_date: bill?.payment_day ?? "",
    amount: money(bill?.amount),
    amount_paid: money(bill?.amount_paid),
    document_number: bill?.document_number ?? "",
    description: bill?.description ?? "",
  };
}

/**
 * A free-text payee opens on the name; a registered one on the picker (read
 * only if the profile cannot list suppliers: its name is on the row). A new
 * or legacy bill opens on the picker, unless suppliers cannot be read.
 */
function initialPayeeKind(
  bill: AccountPayableRow | undefined,
  access: BillFormAccess,
): PayeeKind {
  if (bill?.supplierId) return "supplier";
  if (bill?.payee_name) return "name";

  return access.suppliers ? "supplier" : "name";
}

/** The fields the API receives, with only the chosen payee filled. */
function toSubmission(
  values: AccountPayableFormValues,
): Record<string, string> {
  const payee =
    values.payeeKind === "supplier"
      ? { supplierId: values.supplierId, payee_name: "" }
      : { supplierId: "", payee_name: values.payee_name };

  return {
    branchId: values.branchId,
    registrationUserId: values.registrationUserId,
    category: values.category,
    category_description:
      values.category === "OTHER" ? values.category_description : "",
    ...payee,
    vehicleId: values.vehicleId,
    serviceOrderId: values.serviceOrderId,
    due_date: values.due_date,
    payment_date: values.payment_date,
    amount: values.amount,
    amount_paid: values.amount_paid,
    document_number: values.document_number,
    description: values.description,
  };
}

/**
 * Whether an edit changed anything the API would store (decision 2.5):
 * compared on what would be SENT, so flipping the payee kind and back, or
 * typing a category description the category does not keep, is not a change.
 */
function isFormDirty(
  current: AccountPayableFormValues,
  initial: AccountPayableFormValues,
): boolean {
  const now = toSubmission(current);
  const before = toSubmission(initial);

  return Object.keys(now).some((key) => now[key] !== before[key]);
}

export {
  FULL_ACCESS,
  NO_ACCESS_HINTS,
  initialFormValues,
  isFormDirty,
  isPayeeRequired,
  toSubmission,
  type AccountPayableFormValues,
  type BillFormAccess,
  type PayeeKind,
};
