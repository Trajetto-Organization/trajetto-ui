/**
 * Which notification categories a company's plan can actually produce.
 *
 * The API lists the categories by role only, so a company that hired only
 * Entregas was offered switches for fines, service orders and payables —
 * notifications of Gestão de Frotas it can never receive. Pure, and tested.
 */

type NotificationCategoryKey =
  "FINES" | "MAINTENANCE" | "FINANCE" | "TASKS" | "ACCOUNT";

const FLEET_CATEGORIES: ReadonlySet<NotificationCategoryKey> = new Set([
  "FINES",
  "MAINTENANCE",
  "FINANCE",
]);

/**
 * Unknown modules (the session lookup failed) are not a verdict: every row
 * stays, as the sidebar and the dashboard charts do.
 */
function categoryInPlan(
  category: NotificationCategoryKey,
  enabledModules: readonly string[] | null | undefined,
): boolean {
  if (!enabledModules) return true;
  if (FLEET_CATEGORIES.has(category)) return enabledModules.includes("FLEET");

  return true;
}

function rowsInPlan<TRow extends { category: NotificationCategoryKey }>(
  rows: readonly TRow[],
  enabledModules: readonly string[] | null | undefined,
): TRow[] {
  return rows.filter((row) => categoryInPlan(row.category, enabledModules));
}

/** What the WhatsApp switch says it sends, in the company's own modules. */
function whatsAppToggleCopy(
  userRole: string | undefined,
  isDriver: boolean,
  enabledModules: readonly string[] | null | undefined,
): string {
  const generic = "Ative para receber notificações importantes do sistema";

  if (isDriver) return generic;
  if (enabledModules && !enabledModules.includes("FLEET")) return generic;

  return userRole === "BUSINESS_USER"
    ? "Ative para receber alertas de ordens de serviços e outras notificações importantes"
    : "Ative para receber alertas de multas, ordens de serviços e outras notificações importantes";
}

export { categoryInPlan, rowsInPlan, whatsAppToggleCopy };
export type { NotificationCategoryKey };
