import { ACCOUNT_PAYABLE_CATEGORIES } from "@/schemas/create-update-account-payable-schema";

type AccountPayableCategory = (typeof ACCOUNT_PAYABLE_CATEGORIES)[number];

const ACCOUNT_PAYABLE_CATEGORY_LABELS: Record<AccountPayableCategory, string> =
  {
    FUEL: "Combustível",
    MAINTENANCE: "Manutenção",
    INSURANCE: "Seguro",
    TAXES_FEES: "Impostos e taxas",
    FINES: "Multas",
    TOLLS: "Pedágio",
    RENTAL: "Locação",
    PAYROLL: "Folha de pagamento",
    OTHER: "Outros",
  };

const ACCOUNT_PAYABLE_CATEGORY_OPTIONS = ACCOUNT_PAYABLE_CATEGORIES.map(
  (value) => ({
    value,
    label: ACCOUNT_PAYABLE_CATEGORY_LABELS[value],
  }),
);

/** Display helper tolerant to legacy rows without a category. */
function formatAccountPayableCategory(
  category: string | null | undefined,
): string {
  if (!category) return "—";

  return (
    ACCOUNT_PAYABLE_CATEGORY_LABELS[category as AccountPayableCategory] ??
    category
  );
}

export {
  ACCOUNT_PAYABLE_CATEGORY_LABELS,
  ACCOUNT_PAYABLE_CATEGORY_OPTIONS,
  formatAccountPayableCategory,
};

export type { AccountPayableCategory };
