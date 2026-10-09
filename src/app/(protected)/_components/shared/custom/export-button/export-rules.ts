/**
 * Why the Exportar button cannot be used right now, or null when it can.
 *
 * Exporting counts as a write (decision 4.2): a read-only profile sees the
 * button disabled WITH the reason, and the click handler refuses on the same
 * rule, so a stale enabled button never reaches the server action.
 */
const EXPORT_NEEDS_WRITE = "Exportar exige permissão de escrita nesta seção.";

const EXPORT_NEEDS_DATA =
  "Não há registros para exportar com os filtros atuais.";

interface ExportBlockerInput {
  writePermission?: boolean;

  /** The MASTER holds every permission; the store may not list them. */
  isMaster: boolean;

  hasData: boolean;
}

function exportBlocker({
  writePermission,
  isMaster,
  hasData,
}: ExportBlockerInput): string | null {
  if (!writePermission && !isMaster) return EXPORT_NEEDS_WRITE;

  if (!hasData) return EXPORT_NEEDS_DATA;

  return null;
}

export { exportBlocker, EXPORT_NEEDS_DATA, EXPORT_NEEDS_WRITE };
