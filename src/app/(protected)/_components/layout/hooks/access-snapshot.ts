interface AccessSnapshot {
  role: string | null;
  permissions: ReadonlyArray<{
    permissionKey: string;
    canRead: boolean;
    canWrite: boolean;
  }>;
  /** `null` = not confirmed yet. */
  enabledModules: readonly string[] | null;
}

function permissionSignature(
  permissions: AccessSnapshot["permissions"],
): string {
  return permissions
    .map(
      (permission) =>
        `${permission.permissionKey}:${permission.canRead ? "r" : "-"}${
          permission.canWrite ? "w" : "-"
        }`,
    )
    .sort()
    .join(",");
}

function moduleSignature(modules: readonly string[]): string {
  return [...modules].sort().join(",");
}

/**
 * Whether what this session may see changed between two answers.
 *
 * Decides if the server-rendered page is rendered again after a realtime
 * check (SSR-STALE-1). A store that was never loaded is not a change: the
 * first answer after mount only confirms what the server already rendered
 * with, and refreshing on it would render every page twice.
 *
 * Order does not matter — the API does not promise one — and neither does a
 * modules list the store had not confirmed yet (null).
 */
function accessSnapshotChanged(
  previous: AccessSnapshot,
  next: AccessSnapshot,
): boolean {
  if (previous.role === null) return false;
  if (previous.role !== next.role) return true;

  if (
    permissionSignature(previous.permissions) !==
    permissionSignature(next.permissions)
  ) {
    return true;
  }

  if (previous.enabledModules === null || next.enabledModules === null) {
    return false;
  }

  return (
    moduleSignature(previous.enabledModules) !==
    moduleSignature(next.enabledModules)
  );
}

export { accessSnapshotChanged };
export type { AccessSnapshot };
