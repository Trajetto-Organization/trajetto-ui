/**
 * The platform's own occurrence type ("Comprovante rejeitado", `is_system`)
 * is written by the proof audit, not by the company. The API refuses to edit
 * or delete it (409 OCCURRENCE_TYPE_SYSTEM); the row menu says so up front
 * instead of opening a form that can only fail.
 */
const SYSTEM_OCCURRENCE_TYPE_REASON =
  "Tipo do sistema: registrado pela auditoria de comprovantes, não pode ser editado nem excluído.";

/**
 * Why Editar and Deletar are disabled on a type's row, or null when they are
 * not. A missing permission wins: it is the reason that applies to every row.
 */
function occurrenceTypeWriteBlocker(
  type: { is_system?: boolean },
  permissionBlocker: string | null,
): string | null {
  if (permissionBlocker) return permissionBlocker;

  return type.is_system ? SYSTEM_OCCURRENCE_TYPE_REASON : null;
}

export { occurrenceTypeWriteBlocker, SYSTEM_OCCURRENCE_TYPE_REASON };
