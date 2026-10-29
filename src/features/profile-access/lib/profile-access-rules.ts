/**
 * The access-profile screens' pure rules. No directive and no hooks: the
 * server content, the client components and the tests import it.
 */

/**
 * Why a profile cannot be deleted right now, or null. The API refuses a
 * profile in use (409 PROFILE_ACCESS_IN_USE): deleting it would leave those
 * people with no profile, unable to log in. The menu says so up front.
 */
function deleteProfileBlockedReason(
  usersCount: number,
  writeBlocked: string | null,
): string | null {
  if (writeBlocked) return writeBlocked;

  if (usersCount === 1) {
    return "Em uso por 1 usuário. Troque o perfil dele antes de excluir.";
  }

  if (usersCount > 1) {
    return `Em uso por ${usersCount} usuários. Troque o perfil deles antes de excluir.`;
  }

  return null;
}

/** Spaces around the name are no change (decision 2.5). */
function profileNameChanged(original: string, current: string): boolean {
  return original.trim() !== current.trim();
}

/**
 * "1 usuário" / "3 usuários": the count leads the cell, as it is what the
 * column sorts by on the server.
 */
function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export { countLabel, deleteProfileBlockedReason, profileNameChanged };
